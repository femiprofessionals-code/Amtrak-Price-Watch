import { describe, expect, it } from "vitest";
import { shouldNotify } from "./monitor";

const base = {
  priceCents: 8000,
  targetPriceCents: 10000,
  previousPriceCents: 12000,
  lastNotifiedPriceCents: null,
  notifyOnAnyDrop: false,
};

describe("shouldNotify", () => {
  it("notifies when the price hits the target", () => {
    expect(shouldNotify(base)).toBe(true);
  });

  it("notifies when the price equals the target exactly", () => {
    expect(shouldNotify({ ...base, priceCents: 10000 })).toBe(true);
  });

  it("does not notify above target without notifyOnAnyDrop", () => {
    expect(shouldNotify({ ...base, priceCents: 11000 })).toBe(false);
  });

  it("notifies on any drop when opted in", () => {
    expect(shouldNotify({ ...base, priceCents: 11000, notifyOnAnyDrop: true })).toBe(true);
  });

  it("does not notify on a rise even when opted into any-drop", () => {
    expect(
      shouldNotify({ ...base, priceCents: 13000, notifyOnAnyDrop: true }),
    ).toBe(false);
  });

  it("does not notify on the first check with any-drop (no previous price)", () => {
    expect(
      shouldNotify({ ...base, priceCents: 11000, previousPriceCents: null, notifyOnAnyDrop: true }),
    ).toBe(false);
  });

  it("dedups: no repeat notification at the same price", () => {
    expect(shouldNotify({ ...base, lastNotifiedPriceCents: 8000 })).toBe(false);
  });

  it("dedups: no notification at a higher price than last notified", () => {
    expect(shouldNotify({ ...base, priceCents: 9000, lastNotifiedPriceCents: 8000 })).toBe(false);
  });

  it("notifies again when the fare falls below the last notified price", () => {
    expect(shouldNotify({ ...base, priceCents: 7000, lastNotifiedPriceCents: 8000 })).toBe(true);
  });
});
