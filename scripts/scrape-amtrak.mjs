/**
 * Amtrak fare scraper — runs in GitHub Actions (see .github/workflows/scrape-fares.yml).
 *
 * Flow:
 *   1. GET  {APP_URL}/api/scrape/queries  → the fare queries active alerts need
 *   2. Scrape amtrak.com for each unique (origin, destination, date)
 *   3. POST {APP_URL}/api/scrape/ingest   → store real fares
 *
 * Env:
 *   APP_URL       e.g. https://amtrak-price-watch-ten.vercel.app
 *   CRON_SECRET   shared secret for both endpoints
 *   DEBUG_QUERY   optional "NYP,WAS,2026-08-20" — scrape one query and dump
 *                 diagnostics instead of talking to the app
 */
import { chromium } from "playwright";

const APP_URL = process.env.APP_URL?.replace(/\/$/, "");
const CRON_SECRET = process.env.CRON_SECRET;
const DEBUG_QUERY = process.env.DEBUG_QUERY;

const log = (...args) => console.log(new Date().toISOString().slice(11, 19), ...args);

/** Map Amtrak fare family names to our SeatClass enum. */
function classify(name) {
  const n = (name || "").toLowerCase();
  if (n.includes("coach")) return "COACH";
  if (n.includes("business")) return "BUSINESS";
  if (n.includes("first")) return "FIRST";
  if (n.includes("room") || n.includes("sleeper") || n.includes("bedroom")) return "ROOMETTE";
  return null;
}

async function fetchQueries() {
  const res = await fetch(`${APP_URL}/api/scrape/queries`, {
    headers: { Authorization: `Bearer ${CRON_SECRET}` },
  });
  if (!res.ok) throw new Error(`queries endpoint: HTTP ${res.status}`);
  const { queries } = await res.json();
  return queries;
}

async function ingest(fares) {
  if (fares.length === 0) return { stored: 0 };
  const res = await fetch(`${APP_URL}/api/scrape/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${CRON_SECRET}` },
    body: JSON.stringify({ fares }),
  });
  if (!res.ok) throw new Error(`ingest endpoint: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * Strategy A: call Amtrak's internal journey-search JSON API from inside a
 * real browser page (so Akamai cookies and headers apply).
 * Returns { fares: {seatClass -> priceCents} } or null if the API shape is
 * not what we expect (diagnostics are logged either way).
 */
async function scrapeViaApi(page, origin, destination, date) {
  const result = await page.evaluate(
    async ({ origin, destination, date }) => {
      const body = {
        origin,
        destination,
        departureDate: date,
        travelers: { adults: 1, children: 0, infants: 0, seniors: 0 },
        tripType: "OneWay",
      };
      try {
        const r = await fetch("/dotcom/travel-service/journey/summary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const text = await r.text();
        return { status: r.status, text: text.slice(0, 3000) };
      } catch (e) {
        return { status: -1, text: String(e) };
      }
    },
    { origin, destination, date },
  );

  log(`  [api] status=${result.status} body=${result.text.slice(0, 400).replace(/\s+/g, " ")}`);
  if (result.status !== 200) return null;

  try {
    const data = JSON.parse(result.text);
    // Shape discovery — refined after inspecting real responses.
    const fares = {};
    const walk = (node) => {
      if (!node || typeof node !== "object") return;
      if (Array.isArray(node)) return node.forEach(walk);
      const name = node.className || node.fareFamily || node.travelClass || node.name;
      const dollars = node.lowestPrice ?? node.price?.total ?? node.dollarsAmount ?? node.amount;
      const cls = classify(typeof name === "string" ? name : "");
      if (cls && typeof dollars === "number" && dollars > 0) {
        const cents = Math.round(dollars * 100);
        if (!(cls in fares) || cents < fares[cls]) fares[cls] = cents;
      }
      Object.values(node).forEach(walk);
    };
    walk(data);
    return Object.keys(fares).length > 0 ? fares : null;
  } catch {
    return null;
  }
}

/**
 * Fill an Amtrak station autocomplete field (From/To) and pick the option
 * matching the station code. Fields live in the Angular booking widget on the
 * homepage; there are duplicate hidden copies, so we target the visible one and
 * send real keystrokes so Angular fires its input events.
 */
async function fillStation(page, ariaLabel, city, code) {
  // The station <input> is a zero-size element inside a custom am-autocomplete
  // component, so :visible never matches. Wait for it in the DOM, then drive it
  // with force-click + real keyboard events.
  const field = page.locator(`input[aria-label="${ariaLabel}"]`).first();
  await field.waitFor({ state: "attached", timeout: 25000 });

  // Diagnostics: does it exist, what's its size/box?
  const box = await field.evaluate((el) => {
    const r = el.getBoundingClientRect();
    return { w: Math.round(r.width), h: Math.round(r.height), top: Math.round(r.top), id: el.id };
  }).catch(() => null);
  log(`    [field ${ariaLabel}] box=${JSON.stringify(box)}`);

  // Focus via JS (works on zero-size inputs), then type real keystrokes —
  // this is what makes the autocomplete populate.
  await field.evaluate((el) => el.focus()).catch(() => {});
  await page.keyboard.type(city, { delay: 110 });
  await page.waitForTimeout(2800);

  // Options render into #station-listbox (ariaControls from recon).
  const optCount = await page.locator('#station-listbox [role="option"], #station-listbox li').count();
  log(`    [field ${ariaLabel}] listbox options=${optCount}`);
  if (optCount === 0) {
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    return false;
  }

  // Select the option matching the station code via raw DOM click (bypasses
  // actionability checks on Amtrak's 0-size custom option elements).
  const picked = await page.evaluate((code) => {
    const opts = [...document.querySelectorAll('#station-listbox [role="option"], #station-listbox li')];
    const match = opts.find((el) => (el.textContent || "").toUpperCase().includes(code)) || opts[0];
    if (!match) return null;
    match.click();
    return (match.textContent || "").replace(/\s+/g, " ").trim().slice(0, 60);
  }, code);
  log(`    [field ${ariaLabel}] picked: ${JSON.stringify(picked)}`);
  await page.waitForTimeout(900);
  return picked != null;
}

/**
 * Strategy B: drive the real amtrak.com booking form and read fares off the
 * results page. Also dumps results-page structure for refinement.
 */
async function scrapeViaUi(page, origin, destination, date, cityHints = {}) {
  const [y, m, d] = date.split("-");
  log(`  [ui] loading booking homepage`);
  const resp = await page
    .goto("https://www.amtrak.com/home.html", { waitUntil: "domcontentloaded", timeout: 60000 })
    .catch((e) => {
      log(`  [ui] goto failed: ${e.message?.slice(0, 160)}`);
      return null;
    });
  if (!resp) return null;
  await page.waitForTimeout(8000);

  // Make sure the BOOK tab is active so the From/To/Date fields are interactable.
  const bookTab = page.locator('[role="tab"]', { hasText: /^BOOK$/i }).first();
  if (await bookTab.count()) await bookTab.click().catch(() => {});
  await page.waitForTimeout(1500);

  const fromCity = cityHints[origin] || origin;
  const toCity = cityHints[destination] || destination;

  try {
    log(`  [ui] From ← ${fromCity} (${origin})`);
    await fillStation(page, "From station", fromCity, origin);
    await page.waitForTimeout(700);
    log(`  [ui] To ← ${toCity} (${destination})`);
    await fillStation(page, "To station", toCity, destination);
    await page.waitForTimeout(700);
    // Log the post-fill form state to confirm both stations committed.
    const formState = await page.evaluate(() =>
      (document.body.innerText.match(/From[\s\S]{0,80}?To[\s\S]{0,80}?Depart/) || [""])[0].replace(/\s+/g, " ").slice(0, 160),
    );
    log(`  [ui] form state: ${JSON.stringify(formState)}`);

    log(`  [ui] date ← ${m}/${d}/${y}`);
    const dateField = page.locator('input[placeholder="MM/DD/YYYY"]').first();
    await dateField.waitFor({ state: "attached", timeout: 8000 }).catch(() => {});
    await dateField.evaluate((el) => el.focus()).catch(() => {});
    await page.keyboard.type(`${m}/${d}/${y}`, { delay: 60 });
    await page.keyboard.press("Escape"); // close any datepicker popover
    await page.waitForTimeout(1000);

    log(`  [ui] submitting`);
    const submitted = await page.evaluate(() => {
      const btn = document.querySelector('button[type="submit"][aria-label="FIND TRIP"]');
      if (btn) { btn.click(); return true; }
      return false;
    });
    log(`  [ui] submit clicked=${submitted}`);
    if (!submitted) return null;
  } catch (e) {
    log(`  [ui] form interaction failed: ${e.message?.slice(0, 200)}`);
    return null;
  }

  // Wait for navigation to the results view.
  await page.waitForLoadState("domcontentloaded").catch(() => {});
  await page.waitForTimeout(18000);
  log(`  [ui] after submit url=${page.url()}`);

  // Diagnostics + extraction from the results page.
  const diag = await page.evaluate(() => {
    const bodyText = document.body?.innerText?.slice(0, 1200) ?? "";
    const money = [...document.querySelectorAll("*")]
      .filter((el) => el.children.length === 0)
      .map((el) => el.textContent?.trim())
      .filter((t) => t && /^\$\s?\d{1,4}(\.\d{2})?$/.test(t))
      .slice(0, 30);
    // Elements whose text names a class of service, with a nearby price.
    const classBlocks = [...document.querySelectorAll("[class*='fare'], [class*='class'], [class*='amenity'], button")]
      .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim())
      .filter((t) => /coach|business|first|room|sleeper/i.test(t) && /\$\s?\d/.test(t))
      .slice(0, 30);
    return { bodyText, money, classBlocks };
  });
  log(`  [ui] result title="${await page.title().catch(() => "?")}"`);
  log(`  [ui] money cells: ${JSON.stringify(diag.money).slice(0, 600)}`);
  log(`  [ui] class+price blocks: ${JSON.stringify(diag.classBlocks).slice(0, 900)}`);
  log(`  [ui] body: ${diag.bodyText.replace(/\s+/g, " ").slice(0, 500)}`);

  const fares = {};
  for (const text of diag.classBlocks) {
    const cls = classify(text);
    const mm = text.match(/\$\s?(\d+(?:\.\d{2})?)/);
    if (cls && mm) {
      const cents = Math.round(parseFloat(mm[1]) * 100);
      if (!(cls in fares) || cents < fares[cls]) fares[cls] = cents;
    }
  }
  // If we couldn't tie a price to a class but there ARE prices, expose the
  // lowest as COACH (Amtrak's cheapest fare on the results row is coach).
  if (Object.keys(fares).length === 0 && diag.money.length) {
    const cents = diag.money
      .map((t) => Math.round(parseFloat(t.replace(/[^0-9.]/g, "")) * 100))
      .filter((n) => n > 0);
    if (cents.length) fares.COACH = Math.min(...cents);
  }
  return Object.keys(fares).length > 0 ? fares : null;
}

/**
 * Recon mode (DEBUG_QUERY=RECON): dump the live search form's real structure
 * — inputs, comboboxes, custom elements, shadow roots, the station autocomplete
 * dropdown, and candidate submit buttons — so the driver can be written from
 * facts rather than guesses.
 */
async function recon(page) {
  log("RECON: loading amtrak.com home…");
  await page.goto("https://www.amtrak.com/home.html", { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(9000);
  log(`RECON: title="${await page.title()}"`);

  const structure = await page.evaluate(() => {
    const out = { inputs: [], comboboxes: [], customEls: [], buttons: [], shadowHosts: [] };
    const desc = (el) => ({
      tag: el.tagName.toLowerCase(),
      id: el.id || undefined,
      name: el.getAttribute("name") || undefined,
      type: el.getAttribute("type") || undefined,
      placeholder: el.getAttribute("placeholder") || undefined,
      ariaLabel: el.getAttribute("aria-label") || undefined,
      role: el.getAttribute("role") || undefined,
      ariaControls: el.getAttribute("aria-controls") || undefined,
      autocomplete: el.getAttribute("autocomplete") || undefined,
      cls: (el.className && typeof el.className === "string" ? el.className : "").slice(0, 80) || undefined,
      visible: !!(el.offsetWidth || el.offsetHeight),
    });
    document.querySelectorAll("input, textarea").forEach((el) => out.inputs.push(desc(el)));
    document
      .querySelectorAll('[role="combobox"], [aria-autocomplete], [aria-haspopup="listbox"]')
      .forEach((el) => out.comboboxes.push(desc(el)));
    // Custom elements (hyphenated tag names) — Amtrak uses web components.
    document.querySelectorAll("*").forEach((el) => {
      const t = el.tagName.toLowerCase();
      if (t.includes("-") && !out.customEls.some((c) => c.tag === t)) {
        out.customEls.push({ tag: t, cls: (typeof el.className === "string" ? el.className : "").slice(0, 60) });
      }
      if (el.shadowRoot) out.shadowHosts.push(t);
    });
    document.querySelectorAll('button, [role="button"], a').forEach((el) => {
      const text = (el.textContent || "").trim().slice(0, 40);
      if (/find|train|search|book/i.test(text)) out.buttons.push({ ...desc(el), text });
    });
    return out;
  });

  log("RECON inputs: " + JSON.stringify(structure.inputs).slice(0, 1800));
  log("RECON comboboxes: " + JSON.stringify(structure.comboboxes).slice(0, 1200));
  log("RECON customEls: " + JSON.stringify(structure.customEls.slice(0, 40)));
  log("RECON shadowHosts: " + JSON.stringify([...new Set(structure.shadowHosts)]));
  log("RECON find/train buttons: " + JSON.stringify(structure.buttons).slice(0, 1000));

  // Try to open the "From" station field and capture the autocomplete list.
  const fromGuesses = [
    '[aria-label*="From" i]',
    '[placeholder*="From" i]',
    '#mmb-origin',
    'input[name*="origin" i]',
    '[id*="origin" i]',
    '[data-testid*="origin" i]',
  ];
  for (const sel of fromGuesses) {
    const el = await page.$(sel);
    if (!el) continue;
    log(`RECON: found origin candidate "${sel}" — typing "New York"`);
    try {
      await el.click();
      await el.type("New York", { delay: 120 });
      await page.waitForTimeout(4000);
      const dd = await page.evaluate(() => {
        const opts = [...document.querySelectorAll('[role="option"], li, [class*="option" i], [class*="result" i], [class*="suggest" i]')]
          .map((el) => ({
            tag: el.tagName.toLowerCase(),
            role: el.getAttribute("role") || undefined,
            cls: (typeof el.className === "string" ? el.className : "").slice(0, 60),
            text: (el.textContent || "").trim().slice(0, 50),
          }))
          .filter((o) => o.text && /new york|NYP|penn|moynihan/i.test(o.text))
          .slice(0, 12);
        return opts;
      });
      log(`RECON autocomplete via "${sel}": ${JSON.stringify(dd)}`);
      if (dd.length) break;
    } catch (e) {
      log(`RECON: "${sel}" interaction failed: ${e.message?.slice(0, 120)}`);
    }
  }
  log("RECON complete.");
}

async function main() {
  if (DEBUG_QUERY === "RECON") {
    const browser = await chromium.launch({ args: ["--disable-blink-features=AutomationControlled"] });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900 },
      locale: "en-US",
      timezoneId: "America/New_York",
    });
    await recon(await context.newPage());
    await browser.close();
    return;
  }

  // Station code → city for the autocomplete typeahead (debug mode + fallback).
  const CITY = {
    NYP: "New York", WAS: "Washington", PHL: "Philadelphia", BOS: "Boston",
    BAL: "Baltimore", NWK: "Newark", PVD: "Providence", NHV: "New Haven",
    WIL: "Wilmington", ALB: "Albany", CHI: "Chicago", PHL30: "Philadelphia",
  };

  let queries;
  if (DEBUG_QUERY) {
    const [o, dst, date] = DEBUG_QUERY.split(",");
    queries = ["COACH", "BUSINESS"].map((seatClass) => ({
      originCode: o,
      destinationCode: dst,
      originCity: CITY[o] || o,
      destinationCity: CITY[dst] || dst,
      travelDate: date,
      seatClass,
    }));
    log(`debug mode: ${DEBUG_QUERY}`);
  } else {
    if (!APP_URL || !CRON_SECRET) {
      console.log("::warning::APP_URL/CRON_SECRET not set — skipping.");
      return;
    }
    queries = await fetchQueries();
    log(`${queries.length} fare queries requested by the app`);
    if (queries.length === 0) return;
  }

  // One browser session; group queries by od-date pair (one page load covers
  // every seat class for that trip).
  const browser = await chromium.launch({
    args: ["--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    timezoneId: "America/New_York",
  });
  const page = await context.newPage();

  log("warming up session on amtrak.com…");
  const warm = await page
    .goto("https://www.amtrak.com/home.html", { waitUntil: "domcontentloaded", timeout: 60000 })
    .catch((e) => {
      log(`homepage failed: ${e.message?.slice(0, 200)}`);
      return null;
    });
  log(`homepage status=${warm?.status()} title=${await page.title().catch(() => "?")}`);
  await page.waitForTimeout(5000);

  const groups = new Map();
  for (const q of queries) {
    const key = `${q.originCode}|${q.destinationCode}|${q.travelDate}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(q);
    CITY[q.originCode] = q.originCity || CITY[q.originCode] || q.originCode;
    CITY[q.destinationCode] = q.destinationCity || CITY[q.destinationCode] || q.destinationCode;
  }

  const collected = [];
  for (const [key, group] of groups) {
    const [origin, destination, date] = key.split("|");
    log(`scraping ${origin} → ${destination} on ${date}`);

    let fares = await scrapeViaApi(page, origin, destination, date);
    if (!fares) fares = await scrapeViaUi(page, origin, destination, date, CITY);

    if (!fares) {
      log(`  no fares extracted for ${key}`);
      continue;
    }
    log(`  extracted: ${JSON.stringify(fares)}`);
    for (const q of group) {
      if (fares[q.seatClass] != null) {
        collected.push({
          originCode: origin,
          destinationCode: destination,
          travelDate: date,
          seatClass: q.seatClass,
          priceCents: fares[q.seatClass],
        });
      }
    }
    // Be polite: pause between trips.
    await page.waitForTimeout(4000);
  }

  await browser.close();

  if (DEBUG_QUERY) {
    log(`debug run collected: ${JSON.stringify(collected)}`);
    return;
  }

  const result = await ingest(collected);
  log(`ingested ${result.stored ?? 0} fares (${collected.length} collected)`);
  if (collected.length === 0) {
    console.log("::warning::Scrape run collected no fares — see logs above.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
