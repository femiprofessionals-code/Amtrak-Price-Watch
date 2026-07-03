import type { SeatClass } from "@/generated/prisma/enums";

export type FareQuery = {
  /** Provider station codes, e.g. Amtrak "NYP". */
  originCode: string;
  destinationCode: string;
  /** Travel date as YYYY-MM-DD. */
  travelDate: string;
  passengers: number;
  seatClass: SeatClass;
  /** Time of the check — lets providers/simulations vary prices over time. */
  checkedAt: Date;
};

export type FareQuote = {
  /** Lowest available fare per ticket, in integer cents. */
  priceCents: number;
  currency: "USD";
  /** True when the provider found availability for the query. */
  available: boolean;
  /** Where the number came from: real scraped data or the simulator. */
  source: "live" | "simulated";
};

/**
 * A transportation fare source. Amtrak is the first implementation;
 * additional providers (Greyhound, FlixBus, airlines, …) implement the
 * same interface and register in `providers/index.ts` — no other code
 * changes required.
 */
export interface PriceProvider {
  readonly id: string;
  readonly displayName: string;
  getFare(query: FareQuery): Promise<FareQuote>;
}
