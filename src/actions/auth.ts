"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword, issueAuthToken, consumeAuthToken } from "@/lib/auth";
import { createSession, destroySession } from "@/lib/session";
import { sendEmail } from "@/lib/email/send";
import { verifyEmailTemplate, resetPasswordTemplate } from "@/lib/email/templates";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validation";
import { fieldErrorsFromZod, type ActionState } from "./types";

/** Only allow same-app relative redirect targets (prevents open redirects). */
function safeNext(next: unknown): string {
  if (typeof next === "string" && next.startsWith("/") && !next.startsWith("//")) return next;
  return "/dashboard";
}

export async function register(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };

  const { name, email, password } = parsed.data;

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { fieldErrors: { email: "An account with this email already exists" } };

  const user = await db.user.create({
    data: { name, email, passwordHash: await hashPassword(password) },
  });

  await db.notification.create({
    data: {
      userId: user.id,
      type: "SYSTEM",
      title: "Welcome to Travel Price Watch",
      body: "Create your first alert and we'll start watching fares for you.",
    },
  });

  const token = await issueAuthToken(user.id, "VERIFY_EMAIL", 24 * 60);
  const { subject, html } = verifyEmailTemplate(user.name, token);
  await sendEmail({ to: user.email, subject, html });

  await createSession(user.id);
  redirect("/dashboard");
}

export async function login(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  const valid = user && (await verifyPassword(parsed.data.password, user.passwordHash));
  if (!valid) return { error: "Invalid email or password" };

  await createSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/login");
}

export async function forgotPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  if (user) {
    const token = await issueAuthToken(user.id, "RESET_PASSWORD", 60);
    const { subject, html } = resetPasswordTemplate(user.name, token);
    await sendEmail({ to: user.email, subject, html });
  }

  // Identical response whether or not the account exists (no enumeration).
  return { success: "If an account exists for that email, we've sent a reset link." };
}

export async function resetPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { fieldErrors: fieldErrorsFromZod(parsed.error.issues) };

  const userId = await consumeAuthToken(parsed.data.token, "RESET_PASSWORD");
  if (!userId) return { error: "This reset link is invalid or has expired. Request a new one." };

  await db.user.update({
    where: { id: userId },
    data: { passwordHash: await hashPassword(parsed.data.password) },
  });

  await createSession(userId);
  redirect("/dashboard");
}

export async function verifyEmail(token: string): Promise<boolean> {
  const userId = await consumeAuthToken(token, "VERIFY_EMAIL");
  if (!userId) return false;
  await db.user.update({ where: { id: userId }, data: { emailVerifiedAt: new Date() } });
  return true;
}
