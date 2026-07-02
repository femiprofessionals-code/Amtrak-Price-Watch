import type { FareQuery, FareQuote, PriceProvider } from "./types";

/**
 * Amtrak fare provider.
 *
 * Amtrak does not offer a public fares API, so this MVP adapter produces
 * deterministic, realistic simulated fares. The simulation models the main
 * real-world pricing dynamics:
 *
 *  - a stable per-route base fare (seeded by the station pair)
 *  - fares rise as the travel date approaches (demand curve)
 *  - weekend departures cost more
 *  - premium seat classes multiply the fare
 *  - a slow pseudo-random walk over check time, so watched fares
 *    genuinely drop (and rise) between monitoring runs
 *
 * Because the interface is `PriceProvider`, this module can be swapped for
 * a real data source (scraper, partner API, GDS feed) without touching the
 * monitoring engine or UI.
 */

const CLASS_MULTIPLIER: Record<FareQuery["seatClass"], number> = {
  COACH: 1,
  BUSINESS: 1.55,
  FIRST: 2.4,
  ROOMETTE: 3.2,
};

/** Deterministic 32-bit hash (FNV-1a). */
function hash(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Deterministic [0, 1) value from a seed string. */
function unit(seed: string): number {
  return hash(seed) / 0xffffffff;
}

export const amtrakProvider: PriceProvider = {
  id: "AMTRAK",
  displayName: "Amtrak",

  async getFare(q: FareQuery): Promise<FareQuote> {
    const routeKey = `${q.originCode}->${q.destinationCode}`;

    // Stable base fare for the route: $29–$189 coach.
    const baseCents = Math.round(2900 + unit(`base:${routeKey}`) * 16000);

    // Demand curve: fares climb as departure approaches.
    const daysOut = Math.max(
      0,
      Math.round((Date.parse(q.travelDate + "T00:00:00Z") - q.checkedAt.getTime()) / 86_400_000),
    );
    const demand = daysOut >= 60 ? 0.85 : daysOut >= 30 ? 0.95 : daysOut >= 14 ? 1.05 : daysOut >= 7 ? 1.2 : daysOut >= 3 ? 1.35 : 1.5;

    // Weekend departures (Fri/Sat/Sun) run hotter.
    const dow = new Date(q.travelDate + "T00:00:00Z").getUTCDay();
    const weekend = dow === 5 || dow === 6 || dow === 0 ? 1.12 : 1;

    // Slow random walk: a new value every 6 hours, ±18% around base.
    const bucket = Math.floor(q.checkedAt.getTime() / (6 * 60 * 60 * 1000));
    const walk = 0.82 + unit(`walk:${routeKey}:${q.travelDate}:${q.seatClass}:${bucket}`) * 0.36;

    const price = baseCents * demand * weekend * walk * CLASS_MULTIPLIER[q.seatClass];

    // Round to something fare-like: whole dollars.
    const priceCents = Math.max(500, Math.round(price / 100) * 100);

    return { priceCents, currency: "USD", available: true };
  },
};
