import "server-only";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { db } from "./db";
import { getSession } from "./session";
import type { TokenPurpose } from "@/generated/prisma/enums";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

/** Loads the authenticated user or null. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session) return null;
  return db.user.findUnique({ where: { id: session.userId } });
}

/** Loads the authenticated user or redirects to /login. Use in protected pages/actions. */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Issues a single-use token for email verification or password reset.
 * Only the SHA-256 hash is stored; the raw token goes into the email link.
 */
export async function issueAuthToken(userId: string, purpose: TokenPurpose, ttlMinutes: number) {
  const raw = randomBytes(32).toString("base64url");
  await db.authToken.create({
    data: {
      userId,
      purpose,
      tokenHash: hashToken(raw),
      expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
    },
  });
  return raw;
}

/** Validates a raw token and marks it used. Returns the userId or null. */
export async function consumeAuthToken(raw: string, purpose: TokenPurpose) {
  const record = await db.authToken.findUnique({ where: { tokenHash: hashToken(raw) } });
  if (!record || record.purpose !== purpose || record.usedAt || record.expiresAt < new Date()) {
    return null;
  }
  await db.authToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });
  return record.userId;
}

export function hashToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}
