import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters");

export const registerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
  email: emailSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({ email: emailSchema });

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: passwordSchema,
});

export const SEAT_CLASSES = ["COACH", "BUSINESS", "FIRST", "ROOMETTE"] as const;

export const alertSchema = z.object({
  originId: z.string().min(1, "Choose a departure station"),
  destinationId: z.string().min(1, "Choose a destination station"),
  travelDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
    .refine((d) => new Date(d + "T00:00:00Z") >= new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z"), {
      message: "Travel date must be today or later",
    }),
  passengers: z.coerce.number().int().min(1, "At least 1 passenger").max(8, "At most 8 passengers"),
  seatClass: z.enum(SEAT_CLASSES),
  targetPriceCents: z.coerce.number().int().min(100, "Target price must be at least $1").max(10_000_00, "Target price is too high"),
  notifyOnAnyDrop: z.boolean().default(false),
}).refine((v) => v.originId !== v.destinationId, {
  message: "Departure and destination must be different",
  path: ["destinationId"],
});

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80, "Name is too long"),
  email: emailSchema,
});

export const changePasswordSchema = z.object({
  // Optional at the schema level: accounts created via Google sign-in set
  // their first password without one. The action enforces it when a
  // password already exists.
  currentPassword: z.string().optional(),
  newPassword: passwordSchema,
});

export const notificationPrefsSchema = z.object({
  emailOnPriceDrop: z.boolean(),
  emailOnAlertUpdates: z.boolean(),
});
