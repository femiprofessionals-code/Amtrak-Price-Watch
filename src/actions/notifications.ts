"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function markNotificationRead(id: string, read: boolean) {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { id, userId: user.id },
    data: { readAt: read ? new Date() : null },
  });
  revalidatePath("/notifications");
}

export async function markAllNotificationsRead() {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}
