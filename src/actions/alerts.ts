"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { alertSchema } from "@/lib/validation";
import { getProvider } from "@/lib/providers";
import { sendEmail } from "@/lib/email/send";
import { alertCreatedTemplate } from "@/lib/email/templates";
import { fieldErrorsFromZod, type ActionState } from "./types";

function parseAlertForm(formData: FormData) {
  return alertSchema.safeParse({
    originId: formData.get("originId"),
    destinationId: formData.get("destinationId"),
    travelDate: formData.get("travelDate"),
    passengers: formData.get("passengers"),
    seatClass: formData.get("seatClass"),
    targetPriceCents: Math.round(Number(formData.get("targetPrice") ?? 0) * 100),
    notifyOnAnyDrop: formData.get("notifyOnAnyDrop") === "on",
  });
}

export async function createAlert(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsed = parseAlertForm(formData);
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const data = parsed.data;

  const [origin, destination] = await Promise.all([
    db.station.findUnique({ where: { id: data.originId } }),
    db.station.findUnique({ where: { id: data.destinationId } }),
  ]);
  if (!origin || !destination) return { error: "Unknown station selected." };

  const route = await db.route.upsert({
    where: {
      provider_originId_destinationId: {
        provider: "AMTRAK",
        originId: origin.id,
        destinationId: destination.id,
      },
    },
    update: {},
    create: { provider: "AMTRAK", originId: origin.id, destinationId: destination.id },
  });

  // Fetch the fare right away so the alert starts with live data.
  const now = new Date();
  const quote = await getProvider("AMTRAK").getFare({
    originCode: origin.code,
    destinationCode: destination.code,
    travelDate: data.travelDate,
    passengers: data.passengers,
    seatClass: data.seatClass,
    checkedAt: now,
  });

  const alert = await db.alert.create({
    data: {
      userId: user.id,
      routeId: route.id,
      travelDate: new Date(data.travelDate + "T00:00:00Z"),
      passengers: data.passengers,
      seatClass: data.seatClass,
      targetPriceCents: data.targetPriceCents,
      notifyOnAnyDrop: data.notifyOnAnyDrop,
      currentPriceCents: quote.priceCents,
      lowestPriceCents: quote.priceCents,
      lastCheckedAt: now,
      status: quote.priceCents <= data.targetPriceCents ? "TRIGGERED" : "ACTIVE",
      priceHistory: { create: { priceCents: quote.priceCents, recordedAt: now } },
    },
  });

  await db.notification.create({
    data: {
      userId: user.id,
      alertId: alert.id,
      type: "ALERT_CREATED",
      title: `Alert created: ${origin.city} → ${destination.city}`,
      body: `We're watching this fare and will notify you when it drops below your target.`,
    },
  });

  if (user.emailOnAlertUpdates) {
    const { subject, html } = alertCreatedTemplate(user.name, {
      origin: origin.city,
      destination: destination.city,
      travelDate: alert.travelDate,
      targetPriceCents: alert.targetPriceCents,
      alertId: alert.id,
    });
    await sendEmail({ to: user.email, subject, html });
  }

  revalidatePath("/alerts");
  revalidatePath("/dashboard");
  redirect(`/alerts/${alert.id}?created=1`);
}

/** Loads an alert only if it belongs to the current user. */
async function ownedAlert(alertId: string) {
  const user = await requireUser();
  const alert = await db.alert.findUnique({
    where: { id: alertId },
    include: { route: { include: { origin: true, destination: true } } },
  });
  if (!alert || alert.userId !== user.id) return null;
  return { user, alert };
}

export async function updateAlert(alertId: string, _prev: ActionState, formData: FormData): Promise<ActionState> {
  const owned = await ownedAlert(alertId);
  if (!owned) return { error: "Alert not found." };

  const parsed = alertSchema
    .omit({ originId: true, destinationId: true })
    .safeParse({
      travelDate: formData.get("travelDate"),
      passengers: formData.get("passengers"),
      seatClass: formData.get("seatClass"),
      targetPriceCents: Math.round(Number(formData.get("targetPrice") ?? 0) * 100),
      notifyOnAnyDrop: formData.get("notifyOnAnyDrop") === "on",
    });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };
  const data = parsed.data;

  await db.alert.update({
    where: { id: alertId },
    data: {
      travelDate: new Date(data.travelDate + "T00:00:00Z"),
      passengers: data.passengers,
      seatClass: data.seatClass,
      targetPriceCents: data.targetPriceCents,
      notifyOnAnyDrop: data.notifyOnAnyDrop,
      // A changed target means notification dedup should start fresh.
      lastNotifiedPriceCents: null,
    },
  });

  await db.notification.create({
    data: {
      userId: owned.user.id,
      alertId,
      type: "ALERT_UPDATED",
      title: `Alert updated: ${owned.alert.route.origin.city} → ${owned.alert.route.destination.city}`,
      body: "Your alert settings were saved.",
    },
  });

  revalidatePath("/alerts");
  revalidatePath(`/alerts/${alertId}`);
  return { success: "Alert updated." };
}

export async function setAlertStatus(alertId: string, status: "ACTIVE" | "PAUSED"): Promise<ActionState> {
  const owned = await ownedAlert(alertId);
  if (!owned) return { error: "Alert not found." };
  if (owned.alert.status === "EXPIRED") return { error: "Expired alerts can't be resumed." };

  await db.alert.update({ where: { id: alertId }, data: { status } });
  revalidatePath("/alerts");
  revalidatePath(`/alerts/${alertId}`);
  revalidatePath("/dashboard");
  return { success: status === "PAUSED" ? "Alert paused." : "Alert resumed." };
}

export async function deleteAlert(alertId: string): Promise<ActionState> {
  const owned = await ownedAlert(alertId);
  if (!owned) return { error: "Alert not found." };

  await db.alert.delete({ where: { id: alertId } });
  revalidatePath("/alerts");
  revalidatePath("/dashboard");
  return { success: "Alert deleted." };
}

/** Manually re-checks the fare for one alert (the "Check now" button). */
export async function refreshAlert(alertId: string): Promise<ActionState> {
  const owned = await ownedAlert(alertId);
  if (!owned) return { error: "Alert not found." };

  const { checkAlert } = await import("@/lib/monitor");
  const full = await db.alert.findUniqueOrThrow({
    where: { id: alertId },
    include: { route: { include: { origin: true, destination: true } }, user: true },
  });
  await checkAlert(full);

  revalidatePath(`/alerts/${alertId}`);
  revalidatePath("/alerts");
  revalidatePath("/dashboard");
  return { success: "Price refreshed." };
}
