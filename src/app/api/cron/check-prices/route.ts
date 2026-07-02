import { NextResponse } from "next/server";
import { runPriceCheck } from "@/lib/monitor";

export const maxDuration = 300;

/**
 * Scheduled price monitoring endpoint.
 *
 * Vercel Cron calls this on the schedule in vercel.json and automatically
 * sends "Authorization: Bearer <CRON_SECRET>". Any other scheduler (GitHub
 * Actions, cron-job.org, systemd timer) can call it with the same header.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const result = await runPriceCheck();

  return NextResponse.json({
    ok: true,
    ...result,
    durationMs: Date.now() - started,
  });
}
