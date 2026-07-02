import "server-only";
import { db } from "./db";
import { getProvider } from "./providers";
import { sendEmail } from "./email/send";
import { priceDropTemplate } from "./email/templates";
import { formatCents } from "./format";
import type { Prisma } from "@/generated/prisma/client";

const alertWithRelations = {
  route: { include: { origin: true, destination: true } },
  user: true,
} satisfies Prisma.AlertInclude;

type AlertForCheck = Prisma.AlertGetPayload<{ include: typeof alertWithRelations }>;

export type CheckOutcome = {
  alertId: string;
  priceCents: number;
  notified: boolean;
};

/**
 * Decides whether a notification should be sent for a freshly observed price.
 * Pure function — unit tested in isolation.
 *
 * A notification fires when:
 *  - the price is at/below the user's target, or
 *  - the user opted into "any drop" alerts and the price fell below the
 *    previously observed price,
 * AND we have not already notified at this price or lower (dedup).
 */
export function shouldNotify(args: {
  priceCents: number;
  targetPriceCents: number;
  previousPriceCents: number | null;
  lastNotifiedPriceCents: number | null;
  notifyOnAnyDrop: boolean;
}): boolean {
  const { priceCents, targetPriceCents, previousPriceCents, lastNotifiedPriceCents, notifyOnAnyDrop } = args;

  const targetHit = priceCents <= targetPriceCents;
  const dropped = previousPriceCents != null && priceCents < previousPriceCents;
  const interesting = targetHit || (notifyOnAnyDrop && dropped);
  if (!interesting) return false;

  // Dedup: only notify again if the fare fell further than the last notification.
  return lastNotifiedPriceCents == null || priceCents < lastNotifiedPriceCents;
}

/** Checks one alert: fetches the fare, records history, updates state, notifies. */
export async function checkAlert(alert: AlertForCheck, now = new Date()): Promise<CheckOutcome> {
  const provider = getProvider(alert.route.provider);
  const travelDate = alert.travelDate.toISOString().slice(0, 10);

  const quote = await provider.getFare({
    originCode: alert.route.origin.code,
    destinationCode: alert.route.destination.code,
    travelDate,
    passengers: alert.passengers,
    seatClass: alert.seatClass,
    checkedAt: now,
  });

  const priceCents = quote.priceCents;
  const previousPriceCents = alert.currentPriceCents;
  const targetHit = priceCents <= alert.targetPriceCents;

  const notify = shouldNotify({
    priceCents,
    targetPriceCents: alert.targetPriceCents,
    previousPriceCents,
    lastNotifiedPriceCents: alert.lastNotifiedPriceCents,
    notifyOnAnyDrop: alert.notifyOnAnyDrop,
  });

  await db.$transaction([
    db.priceHistory.create({ data: { alertId: alert.id, priceCents, recordedAt: now } }),
    db.alert.update({
      where: { id: alert.id },
      data: {
        currentPriceCents: priceCents,
        lowestPriceCents: Math.min(priceCents, alert.lowestPriceCents ?? priceCents),
        lastCheckedAt: now,
        status: targetHit ? "TRIGGERED" : alert.status === "TRIGGERED" ? "ACTIVE" : alert.status,
        ...(notify ? { lastNotifiedPriceCents: priceCents } : {}),
      },
    }),
  ]);

  if (notify) {
    const routeLabel = `${alert.route.origin.city} → ${alert.route.destination.city}`;
    await db.notification.create({
      data: {
        userId: alert.userId,
        alertId: alert.id,
        type: "PRICE_DROP",
        title: targetHit ? `Target hit: ${routeLabel}` : `Price drop: ${routeLabel}`,
        body: `The fare is now ${formatCents(priceCents)} (your target: ${formatCents(alert.targetPriceCents)}).`,
      },
    });

    if (alert.user.emailOnPriceDrop) {
      const { subject, html } = priceDropTemplate(alert.user.name, {
        origin: alert.route.origin.city,
        destination: alert.route.destination.city,
        travelDate: alert.travelDate,
        targetPriceCents: alert.targetPriceCents,
        currentPriceCents: priceCents,
        previousPriceCents,
        alertId: alert.id,
      });
      await sendEmail({ to: alert.user.email, subject, html });
    }
  }

  return { alertId: alert.id, priceCents, notified: notify };
}

/**
 * Runs a full monitoring pass: expires stale alerts, then checks every
 * ACTIVE and TRIGGERED alert with an upcoming travel date.
 */
export async function runPriceCheck(now = new Date()) {
  const today = new Date(now.toISOString().slice(0, 10) + "T00:00:00Z");

  const expired = await db.alert.updateMany({
    where: { status: { in: ["ACTIVE", "TRIGGERED", "PAUSED"] }, travelDate: { lt: today } },
    data: { status: "EXPIRED" },
  });

  const alerts = await db.alert.findMany({
    where: { status: { in: ["ACTIVE", "TRIGGERED"] }, travelDate: { gte: today } },
    include: alertWithRelations,
    orderBy: { lastCheckedAt: { sort: "asc", nulls: "first" } },
  });

  const outcomes: CheckOutcome[] = [];
  for (const alert of alerts) {
    try {
      outcomes.push(await checkAlert(alert, now));
    } catch (err) {
      console.error(`[monitor] Failed to check alert ${alert.id}:`, err);
    }
  }

  return {
    checked: outcomes.length,
    notified: outcomes.filter((o) => o.notified).length,
    expired: expired.count,
  };
}
