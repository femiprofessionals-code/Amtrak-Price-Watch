import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return secret && request.headers.get("authorization") === `Bearer ${secret}`;
}

/**
 * Returns the distinct fare queries the scraper should fetch: one entry per
 * (origin, destination, travelDate, seatClass) across all watchable alerts.
 */
export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = new Date(new Date().toISOString().slice(0, 10) + "T00:00:00Z");
  const alerts = await db.alert.findMany({
    where: { status: { in: ["ACTIVE", "TRIGGERED"] }, travelDate: { gte: today } },
    include: { route: { include: { origin: true, destination: true } } },
  });

  const seen = new Set<string>();
  const queries = [];
  for (const a of alerts) {
    const q = {
      originCode: a.route.origin.code,
      destinationCode: a.route.destination.code,
      travelDate: a.travelDate.toISOString().slice(0, 10),
      seatClass: a.seatClass,
    };
    const key = `${q.originCode}|${q.destinationCode}|${q.travelDate}|${q.seatClass}`;
    if (!seen.has(key)) {
      seen.add(key);
      queries.push(q);
    }
  }

  return NextResponse.json({ queries });
}
