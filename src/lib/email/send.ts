import "server-only";
import { Resend } from "resend";

type SendArgs = {
  to: string;
  subject: string;
  html: string;
};

/**
 * Sends an email via Resend. When RESEND_API_KEY is not configured
 * (local development), the email is logged to the console instead so
 * flows remain testable end-to-end.
 */
export async function sendEmail({ to, subject, html }: SendArgs): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Travel Price Watch <onboarding@resend.dev>";

  if (!apiKey) {
    console.info(`[email:dev] To: ${to} | Subject: ${subject}`);
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from, to, subject, html });
  if (error) {
    // Email failures must never take down the request that triggered them.
    console.error(`[email] Failed to send "${subject}" to ${to}:`, error);
  }
}
