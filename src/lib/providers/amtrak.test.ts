import { describe, expect, it } from "vitest";
import { amtrakProvider } from "./amtrak";
import type { FareQuery } from "./types";

const base: FareQuery = {
  originCode: "NYP",
  destinationCode: "BOS",
  travelDate: "2026-08-15",
  passengers: 1,
  seatClass: "COACH",
  checkedAt: new Date("2026-07-01T12:00:00Z"),
};

describe("amtrakProvider", () => {
  it("returns a realistic fare in whole dollars", async () => {
    const quote = await amtrakProvider.getFare(base);
    expect(quote.available).toBe(true);
    expect(quote.currency).toBe("USD");
    expect(quote.priceCents).toBeGreaterThanOrEqual(500);
    expect(quote.priceCents).toBeLessThanOrEqual(150_000);
    expect(quote.priceCents % 100).toBe(0);
  });

  it("is deterministic for the same query and time bucket", async () => {
    const a = await amtrakProvider.getFare(base);
    const b = await amtrakProvider.getFare({ ...base, checkedAt: new Date("2026-07-01T13:30:00Z") });
    expect(a.priceCents).toBe(b.priceCents);
  });

  it("varies over time so watched fares can drop", async () => {
    const prices = new Set<number>();
    for (let day = 1; day <= 10; day++) {
      const quote = await amtrakProvider.getFare({
        ...base,
        checkedAt: new Date(`2026-07-${String(day).padStart(2, "0")}T12:00:00Z`),
      });
      prices.add(quote.priceCents);
    }
    expect(prices.size).toBeGreaterThan(3);
  });

  it("charges more for premium classes", async () => {
    const coach = await amtrakProvider.getFare(base);
    const first = await amtrakProvider.getFare({ ...base, seatClass: "FIRST" });
    expect(first.priceCents).toBeGreaterThan(coach.priceCents);
  });

  it("prices differ across routes", async () => {
    const a = await amtrakProvider.getFare(base);
    const b = await amtrakProvider.getFare({ ...base, originCode: "CHI", destinationCode: "SEA" });
    expect(a.priceCents).not.toBe(b.priceCents);
  });
});
