import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { SEAT_CLASSES } from "@/lib/validation";

const ingestSchema = z.object({
  fares: z
    .array(
      z.object({
        originCode: z.string().min(2).max(5),
        destinationCode: z.string().min(2).max(5),
        travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        seatClass: z.enum(SEAT_CLASSES),
        priceCents: z.number().int().min(100).max(10_000_00),
      }),
    )
    .max(500),
});

/** Receives real scraped fares from the GitHub Actions scraper. */
export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = ingestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const now = new Date();
  let stored = 0;
  for (const f of parsed.data.fares) {
    await db.scrapedFare.upsert({
      where: {
        provider_originCode_destinationCode_travelDate_seatClass: {
          provider: "AMTRAK",
          originCode: f.originCode,
          destinationCode: f.destinationCode,
          travelDate: new Date(f.travelDate + "T00:00:00Z"),
          seatClass: f.seatClass,
        },
      },
      update: { priceCents: f.priceCents, scrapedAt: now },
      create: {
        provider: "AMTRAK",
        originCode: f.originCode,
        destinationCode: f.destinationCode,
        travelDate: new Date(f.travelDate + "T00:00:00Z"),
        seatClass: f.seatClass,
        priceCents: f.priceCents,
      },
    });
    stored++;
  }

  return NextResponse.json({ ok: true, stored });
}
