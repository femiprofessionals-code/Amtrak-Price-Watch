import { formatCents, formatDate } from "@/lib/format";

const BRAND = "Travel Price Watch";
const ACCENT = "#4f46e5";

function appUrl(path = "") {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}${path}`;
}

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Responsive shell shared by every email. Inline styles for client compatibility. */
function layout(preheader: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <span style="display:none;max-height:0;overflow:hidden;">${escapeHtml(preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f7;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
        <tr><td style="padding:0 8px 20px;">
          <span style="font-size:18px;font-weight:700;color:#18181b;">🚆 ${BRAND}</span>
        </td></tr>
        <tr><td style="background:#ffffff;border-radius:16px;padding:36px 36px 32px;border:1px solid #e4e4e7;">
          ${content}
        </td></tr>
        <tr><td style="padding:20px 8px;color:#71717a;font-size:12px;line-height:1.6;">
          You are receiving this email because you have an account on ${BRAND}.<br>
          Manage your notification preferences in <a href="${appUrl("/settings")}" style="color:${ACCENT};">Settings</a>.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function button(label: string, href: string) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;"><tr><td style="border-radius:10px;background:${ACCENT};">
    <a href="${href}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;border-radius:10px;">${escapeHtml(label)}</a>
  </td></tr></table>`;
}

const h1 = (t: string) => `<h1 style="margin:0 0 16px;font-size:22px;color:#18181b;">${t}</h1>`;
const p = (t: string) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.65;color:#3f3f46;">${t}</p>`;
const muted = (t: string) => `<p style="margin:18px 0 0;font-size:13px;color:#a1a1aa;">${t}</p>`;

export function verifyEmailTemplate(name: string, token: string) {
  const link = appUrl(`/verify-email?token=${token}`);
  return {
    subject: `Verify your email — ${BRAND}`,
    html: layout("Confirm your email address to activate your account.", [
      h1(`Welcome aboard, ${escapeHtml(name)}!`),
      p("Confirm your email address to finish setting up your account and start tracking fares."),
      button("Verify email", link),
      muted("This link expires in 24 hours. If you didn't create an account, you can safely ignore this email."),
    ].join("")),
  };
}

export function resetPasswordTemplate(name: string, token: string) {
  const link = appUrl(`/reset-password?token=${token}`);
  return {
    subject: `Reset your password — ${BRAND}`,
    html: layout("Use this link to choose a new password.", [
      h1("Reset your password"),
      p(`Hi ${escapeHtml(name)}, we received a request to reset your password. Click below to choose a new one.`),
      button("Reset password", link),
      muted("This link expires in 60 minutes. If you didn't request a reset, you can safely ignore this email."),
    ].join("")),
  };
}

type AlertEmailInfo = {
  origin: string;
  destination: string;
  travelDate: Date;
  targetPriceCents: number;
  alertId: string;
};

export function alertCreatedTemplate(name: string, a: AlertEmailInfo) {
  return {
    subject: `Alert created: ${a.origin} → ${a.destination}`,
    html: layout("We're now watching this fare for you.", [
      h1("Your price alert is live"),
      p(`Hi ${escapeHtml(name)}, we're now watching <strong>${escapeHtml(a.origin)} → ${escapeHtml(a.destination)}</strong> on ${formatDate(a.travelDate)}.`),
      p(`We'll email you as soon as the fare drops below <strong>${formatCents(a.targetPriceCents)}</strong>.`),
      button("View alert", appUrl(`/alerts/${a.alertId}`)),
    ].join("")),
  };
}

export function priceDropTemplate(
  name: string,
  a: AlertEmailInfo & { currentPriceCents: number; previousPriceCents?: number | null },
) {
  const below = a.currentPriceCents <= a.targetPriceCents;
  return {
    subject: below
      ? `🎉 Target hit: ${a.origin} → ${a.destination} is now ${formatCents(a.currentPriceCents)}`
      : `Price drop: ${a.origin} → ${a.destination} is now ${formatCents(a.currentPriceCents)}`,
    html: layout("A fare you're watching just dropped.", [
      h1(below ? "Your target price was hit! 🎉" : "A fare you're watching dropped"),
      p(`Hi ${escapeHtml(name)}, the fare for <strong>${escapeHtml(a.origin)} → ${escapeHtml(a.destination)}</strong> on ${formatDate(a.travelDate)} is now:`),
      `<div style="margin:20px 0;padding:20px 24px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;">
        <span style="font-size:30px;font-weight:800;color:#15803d;">${formatCents(a.currentPriceCents)}</span>
        ${a.previousPriceCents ? `<span style="font-size:15px;color:#71717a;margin-left:10px;text-decoration:line-through;">${formatCents(a.previousPriceCents)}</span>` : ""}
        <div style="font-size:13px;color:#3f3f46;margin-top:6px;">Your target: ${formatCents(a.targetPriceCents)}</div>
      </div>`,
      p("Fares can rise again quickly — book soon if the price works for you."),
      button("Book on Amtrak.com", "https://www.amtrak.com"),
      muted(`Manage this alert any time from your <a href="${appUrl(`/alerts/${a.alertId}`)}" style="color:${ACCENT};">dashboard</a>.`),
    ].join("")),
  };
}
