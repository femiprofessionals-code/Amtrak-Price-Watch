"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser, hashPassword, verifyPassword } from "@/lib/auth";
import { destroySession } from "@/lib/session";
import { profileSchema, changePasswordSchema, notificationPrefsSchema } from "@/lib/validation";
import { fieldErrorsFromZod, type ActionState } from "./types";

export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };

  if (parsed.data.email !== user.email) {
    const taken = await db.user.findUnique({ where: { email: parsed.data.email } });
    if (taken) return { fieldErrors: { email: "That email is already in use" } };
  }

  await db.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      // Changing email requires re-verification.
      ...(parsed.data.email !== user.email ? { emailVerifiedAt: null } : {}),
    },
  });

  revalidatePath("/settings");
  return { success: "Profile updated." };
}

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) return { fieldErrors: { currentPassword: "Current password is incorrect" } };

  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data.newPassword) },
  });

  return { success: "Password changed." };
}

export async function updateNotificationPrefs(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const parsed = notificationPrefsSchema.safeParse({
    emailOnPriceDrop: formData.get("emailOnPriceDrop") === "on",
    emailOnAlertUpdates: formData.get("emailOnAlertUpdates") === "on",
  });
  if (!parsed.success) return { error: "Invalid preferences." };

  await db.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/settings");
  return { success: "Notification preferences saved." };
}

export async function deleteAccount(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();

  const confirmation = formData.get("confirm");
  if (confirmation !== user.email) {
    return { fieldErrors: { confirm: "Type your email exactly to confirm" } };
  }

  await db.user.delete({ where: { id: user.id } });
  await destroySession();
  redirect("/");
}
