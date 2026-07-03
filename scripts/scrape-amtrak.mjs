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
// Stealth browser: playwright-extra + the stealth plugin patch the headless
// fingerprints (navigator.webdriver, chrome runtime, WebGL vendor, etc.) that
// Amtrak's Akamai bot-shield shows the real dropdown / API only to "human"
// sessions. Falls back to plain playwright if the plugins aren't installed.
let chromium;
try {
  const extra = await import("playwright-extra");
  const stealth = (await import("puppeteer-extra-plugin-stealth")).default;
  chromium = extra.chromium;
  chromium.use(stealth());
  console.log("using playwright-extra + stealth");
} catch (e) {
  chromium = (await import("playwright")).chromium;
  console.log("stealth unavailable, using plain playwright:", e?.message?.slice(0, 80));
}

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

const SCRAPINGBEE_API_KEY = process.env.SCRAPINGBEE_API_KEY;

// Amtrak station code → Wanderu city slug (state/city). Wanderu lists real
// Amtrak fares per route and, unlike amtrak.com, is scrapable.
const WANDERU_SLUG = {
  NYP: "us-ny/new-york", NWK: "us-nj/newark", PHL: "us-pa/philadelphia",
  WAS: "us-dc/washington", BAL: "us-md/baltimore", BOS: "us-ma/boston",
  BBY: "us-ma/boston", PVD: "us-ri/providence", NHV: "us-ct/new-haven",
  WIL: "us-de/wilmington", RVR: "us-va/richmond", ALB: "us-ny/albany",
  CHI: "us-il/chicago", MKE: "us-wi/milwaukee", STL: "us-mo/st-louis",
  MSP: "us-mn/saint-paul", DET: "us-mi/detroit", CLE: "us-oh/cleveland",
  PGH: "us-pa/pittsburgh", CIN: "us-oh/cincinnati", IND: "us-in/indianapolis",
  KCY: "us-mo/kansas-city", DEN: "us-co/denver", SLC: "us-ut/salt-lake-city",
  LAX: "us-ca/los-angeles", SAN: "us-ca/san-diego", SNA: "us-ca/santa-ana",
  SBA: "us-ca/santa-barbara", SJC: "us-ca/san-jose", EMY: "us-ca/emeryville",
  SAC: "us-ca/sacramento", PDX: "us-or/portland", SEA: "us-wa/seattle",
  ATL: "us-ga/atlanta", CLT: "us-nc/charlotte", RGH: "us-nc/raleigh",
  SAV: "us-ga/savannah", JAX: "us-fl/jacksonville", ORL: "us-fl/orlando",
  TPA: "us-fl/tampa", MIA: "us-fl/miami", NOL: "us-la/new-orleans",
  HOU: "us-tx/houston", DAL: "us-tx/dallas", AUS: "us-tx/austin",
  SAS: "us-tx/san-antonio", ABQ: "us-nm/albuquerque", FLG: "us-az/flagstaff",
  TUS: "us-az/tucson", PHX: "us-az/maricopa",
};

/** Extract {seatClass -> priceCents} from a rendered results-page HTML string. */
function extractFaresFromHtml(html) {
  const fares = {};
  // Find "$NNN" amounts sitting near a class-of-service word.
  const re = /(coach|business|first|room|sleeper|bedroom)[^$]{0,120}?\$\s?(\d{1,4}(?:\.\d{2})?)/gi;
  let m;
  while ((m = re.exec(html))) {
    const cls = classify(m[1]);
    if (!cls) continue;
    const cents = Math.round(parseFloat(m[2]) * 100);
    if (cents > 0 && (!(cls in fares) || cents < fares[cls])) fares[cls] = cents;
  }
  // If nothing tied to a class, take the lowest standalone $amount as coach.
  if (Object.keys(fares).length === 0) {
    const amounts = [...html.matchAll(/\$\s?(\d{2,4}(?:\.\d{2})?)/g)]
      .map((a) => Math.round(parseFloat(a[1]) * 100))
      .filter((n) => n >= 500 && n <= 150000);
    if (amounts.length) fares.COACH = Math.min(...amounts);
  }
  return fares;
}

/**
 * Primary strategy when SCRAPINGBEE_API_KEY is set: fetch Amtrak's search
 * results through ScrapingBee's stealth (residential) pool with JS rendering —
 * one billed request per scrape. The residential IP should un-neuter the
 * booking app that Amtrak degrades for datacenter IPs.
 */
/**
 * Fetch real Amtrak fares from Wanderu (which aggregates Amtrak pricing) via
 * ScrapingBee. Wanderu is server-rendered and scrapable, unlike amtrak.com.
 */
async function scrapeViaWanderu(origin, destination, date) {
  const o = WANDERU_SLUG[origin];
  const d = WANDERU_SLUG[destination];
  if (!o || !d) {
    log(`  [wanderu] no slug for ${origin} or ${destination}`);
    return null;
  }
  const target = `https://www.wanderu.com/en-us/train/${o}/${d}/`;
  const params = new URLSearchParams({
    api_key: SCRAPINGBEE_API_KEY,
    url: target,
    render_js: "true",
    premium_proxy: "true",
    country_code: "us",
    wait: "6000",
    timeout: "120000",
  });
  log(`  [wanderu] fetching ${target}`);
  const res = await fetch(`https://app.scrapingbee.com/api/v1/?${params}`);
  const cost = res.headers.get("spb-cost");
  log(`  [wanderu] status=${res.status} cost=${cost}`);
  if (!res.ok) {
    log(`  [wanderu] error: ${(await res.text()).slice(0, 200)}`);
    return null;
  }
  const html = await res.text();
  const title = (html.match(/<title>([^<]*)<\/title>/i) || [])[1] || "?";
  // Amounts appearing as $NN or $NN.NN across the page.
  const amounts = [...html.matchAll(/\$\s?(\d{1,4})(?:\.(\d{2}))?/g)]
    .map((m) => Math.round(parseFloat(m[1] + "." + (m[2] || "00")) * 100))
    .filter((c) => c >= 500 && c <= 200000);
  const acela = /acela/i.test(html);
  log(`  [wanderu] title="${title}" amounts=${JSON.stringify([...new Set(amounts)].slice(0, 15))} acela=${acela}`);
  if (!amounts.length) return null;

  // Lowest fare = Coach. If Acela is mentioned, its (higher) fares map to First.
  const sorted = [...new Set(amounts)].sort((a, b) => a - b);
  const fares = { COACH: sorted[0] };
  if (acela && sorted.length > 1) fares.FIRST = sorted[sorted.length - 1];
  return fares;
}

async function scrapeViaScrapingBee(origin, destination, date, cityHints = {}) {
  const [y, mo, d] = date.split("-");
  const fromCity = cityHints[origin] || origin;
  const toCity = cityHints[destination] || destination;

  // Drive Amtrak's booking form entirely through evaluate() — JavaScript works
  // on the 0-size custom inputs that fill()/click() can't touch. Type via the
  // native value setter + input event (Angular ngModel reacts to that), then
  // dispatch a full mouse sequence on the matching option. Each step returns a
  // diagnostic string surfaced in evaluate_results (json_response=true).
  // Click the VISIBLE option (offsetWidth>0) matching the code — there are
  // duplicate 0-size a11y-mirror options, and earlier selectors hit those.
  // Report the hidden stationSearchCode fields immediately after, to confirm
  // the selection actually committed to Angular's model.
  const clickVisible = (code) =>
    `(function(){var opts=[].slice.call(document.querySelectorAll('mat-option,[role=option],#station-listbox li'));` +
    `var vis=opts.filter(function(o){return o.offsetWidth>0&&o.offsetHeight>0&&(o.textContent||'').toUpperCase().indexOf('${code}')>-1});` +
    `var t=vis[0];if(!t)return 'novis|total='+opts.length;t.scrollIntoView();` +
    `['pointerdown','mousedown','mouseup','click'].forEach(function(ev){t.dispatchEvent(new MouseEvent(ev,{bubbles:true,cancelable:true,view:window}))});` +
    `var codes=[].slice.call(document.querySelectorAll('input[name=stationSearchCode]')).map(function(i){return i.value}).filter(Boolean);` +
    `return 'clk:'+(t.textContent||'').replace(/\\s+/g,' ').trim().slice(0,24)+'|codes='+JSON.stringify(codes);})()`;

  const jsScenario = {
    instructions: [
      { wait: 8000 },
      { fill: ['input[aria-label="From station"]', fromCity] },
      { wait: 3500 },
      { evaluate: clickVisible(origin) },
      { wait: 1500 },
      { fill: ['input[aria-label="To station"]', toCity] },
      { wait: 3500 },
      { evaluate: clickVisible(destination) },
      { wait: 1500 },
      { fill: ['input[placeholder="MM/DD/YYYY"]', `${mo}/${d}/${y}`] },
      { wait: 1000 },
      { evaluate: `(function(){var g=function(l){var i=document.querySelector('input[aria-label="'+l+'"]');return i?i.value:'?'};var codes=[].slice.call(document.querySelectorAll('input[name=stationSearchCode]')).map(function(i){return i.value}).filter(Boolean);var errs=(document.body.innerText.match(/enter a valid station/gi)||[]).length;return 'from='+g('From station')+'|to='+g('To station')+'|codes='+JSON.stringify(codes)+'|validErrs='+errs;})()` },
      { wait_for_and_click: `//button[@type="submit"][@aria-label="FIND TRIP"]` },
      { wait: 16000 },
      { evaluate: `(function(){var p=(document.body.innerText.match(/\\$\\s?\\d{2,4}/g)||[]).slice(0,12);return 'url='+location.pathname+'|err='+((document.body.innerText.match(/enter a valid station|select a date|required/gi)||[]).join(',')||'none')+'|prices='+(p.join(',')||'none');})()` },
    ],
  };

  const params = new URLSearchParams({
    api_key: SCRAPINGBEE_API_KEY,
    url: "https://www.amtrak.com/home.html",
    render_js: "true",
    // premium_proxy (residential) supports js_scenario; stealth_proxy does NOT
    // (it silently ignores the scenario — the reason the form never drove).
    premium_proxy: "true",
    country_code: "us",
    json_response: "true",
    js_scenario: JSON.stringify(jsScenario),
    timeout: "140000",
  });

  const endpoint = `https://app.scrapingbee.com/api/v1/?${params}`;
  log(`  [bee] driving form ${origin}→${destination} via ScrapingBee stealth pool`);
  const res = await fetch(endpoint);
  log(`  [bee] status=${res.status}`);
  if (!res.ok) {
    log(`  [bee] error body: ${(await res.text()).slice(0, 300)}`);
    return null;
  }
  const data = await res.json();
  log(`  [bee] cost=${data.cost ?? "?"} keys=${JSON.stringify(Object.keys(data))}`);
  log(`  [bee] evaluate_results=${JSON.stringify(data.evaluate_results || []).slice(0, 500)}`);
  log(`  [bee] js_scenario_report=${JSON.stringify(data.js_scenario_report || {}).slice(0, 900)}`);
  const html = typeof data.body === "string" ? data.body : "";
  const dollarHits = (html.match(/\$\s?\d{2,4}/g) || []).slice(0, 12);
  log(`  [bee] html len=${html.length} dollars=${JSON.stringify(dollarHits)}`);
  // Reveal Amtrak's own backend API calls (station/fare/journey) so we can
  // consider calling the fare endpoint directly through the residential proxy.
  const xhr = Array.isArray(data.xhr) ? data.xhr : [];
  const apiCalls = xhr
    .map((x) => `${x.method || "?"} ${x.status || "?"} ${(x.url || "").slice(0, 110)}`)
    .filter((u) => /journey|fare|search|station|travel|trip|avail|price|booking/i.test(u))
    .slice(0, 12);
  log(`  [bee] xhr(${xhr.length}) api=${JSON.stringify(apiCalls)}`);

  const fares = extractFaresFromHtml(html);
  return Object.keys(fares).length ? fares : null;
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

  // Diagnostic: dump the geometry of the option matching `code` and its
  // descendants, plus what element actually sits at its on-screen center —
  // to find the real clickable target behind Amtrak's 0-size [role=option].
  const geo = await page.evaluate((code) => {
    const opts = [...document.querySelectorAll('#station-listbox [role="option"], #station-listbox li, [role="option"]')];
    const opt = opts.find((el) => (el.textContent || "").toUpperCase().includes(code)) || opts[0];
    if (!opt) return { found: false, total: opts.length };
    const rect = opt.getBoundingClientRect();
    const kids = [...opt.querySelectorAll("*")].slice(0, 6).map((k) => {
      const r = k.getBoundingClientRect();
      return { tag: k.tagName.toLowerCase(), w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.x), y: Math.round(r.y) };
    });
    // Largest descendant (likely the visible clickable row).
    let big = opt, bigA = 0;
    for (const k of opt.querySelectorAll("*")) {
      const r = k.getBoundingClientRect();
      if (r.width * r.height > bigA) { bigA = r.width * r.height; big = k; }
    }
    const br = big.getBoundingClientRect();
    return {
      found: true,
      total: opts.length,
      optTag: opt.tagName.toLowerCase(),
      optRect: { w: Math.round(rect.width), h: Math.round(rect.height), x: Math.round(rect.x), y: Math.round(rect.y) },
      kids,
      biggest: { tag: big.tagName.toLowerCase(), w: Math.round(br.width), h: Math.round(br.height), cx: Math.round(br.x + br.width / 2), cy: Math.round(br.y + br.height / 2) },
    };
  }, code);
  log(`    [field ${ariaLabel}] optgeo: ${JSON.stringify(geo)}`);

  // Try clicking at the center of the biggest visible descendant via mouse.
  if (geo.found && geo.biggest.w > 0 && geo.biggest.h > 0) {
    await page.mouse.click(geo.biggest.cx, geo.biggest.cy);
    log(`    [field ${ariaLabel}] mouse-clicked biggest descendant @${geo.biggest.cx},${geo.biggest.cy}`);
  } else {
    // Everything is 0-size: fall back to keyboard commit.
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    log(`    [field ${ariaLabel}] all 0-size — ArrowDown+Enter`);
  }
  await page.waitForTimeout(900);
  return true;
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

  // Capture Amtrak's own fare JSON straight off the wire — if the search runs,
  // this is the real prize regardless of how the results page renders.
  const captured = [];
  const onResp = async (resp) => {
    try {
      const url = resp.url();
      if (!/journey|fare|search|travel|trip|avail|price/i.test(url)) return;
      const ct = (resp.headers()["content-type"] || "").toLowerCase();
      if (!ct.includes("json")) return;
      const body = await resp.text();
      if (/(fare|price|amount|lowestPrice|dollars)/i.test(body)) {
        captured.push({ url: url.slice(0, 90), status: resp.status(), body: body.slice(0, 400) });
      }
    } catch {
      /* ignore */
    }
  };
  page.on("response", onResp);

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
  page.off("response", onResp);
  log(`  [ui] after submit url=${page.url()}`);
  log(`  [ui] captured ${captured.length} fare-ish responses`);
  for (const c of captured.slice(0, 3)) {
    log(`  [ui] wire: ${c.status} ${c.url} :: ${c.body.replace(/\s+/g, " ")}`);
  }

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

  // Only spin up a real browser for the in-browser fallback strategies.
  // With ScrapingBee configured, everything goes over its HTTP API (no browser).
  let browser = null;
  let page = null;
  if (!SCRAPINGBEE_API_KEY) {
    browser = await chromium.launch({ args: ["--disable-blink-features=AutomationControlled"] });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
      viewport: { width: 1440, height: 900 },
      locale: "en-US",
      timezoneId: "America/New_York",
    });
    page = await context.newPage();
    log("warming up session on amtrak.com…");
    const warm = await page
      .goto("https://www.amtrak.com/home.html", { waitUntil: "domcontentloaded", timeout: 60000 })
      .catch((e) => {
        log(`homepage failed: ${e.message?.slice(0, 200)}`);
        return null;
      });
    log(`homepage status=${warm?.status()} title=${await page.title().catch(() => "?")}`);
    await page.waitForTimeout(5000);
  } else {
    log("SCRAPINGBEE_API_KEY set — using ScrapingBee HTTP API (no local browser)");
  }

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

    // ScrapingBee (residential + stealth) is the primary path when configured;
    // the in-browser strategies are a fallback for local/no-key runs.
    let fares = null;
    if (SCRAPINGBEE_API_KEY) {
      // Wanderu aggregates real Amtrak fares and is scrapable; amtrak.com's
      // form is not automatable, so Wanderu is the primary real-data source.
      fares = await scrapeViaWanderu(origin, destination, date);
    } else {
      fares = await scrapeViaApi(page, origin, destination, date);
      if (!fares) fares = await scrapeViaUi(page, origin, destination, date, CITY);
    }

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
    await new Promise((r) => setTimeout(r, 3000));
  }

  if (browser) await browser.close();

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
