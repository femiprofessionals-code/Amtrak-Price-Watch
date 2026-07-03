import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { getProvider } from "@/lib/providers";
import { SEAT_CLASSES } from "@/lib/validation";

const querySchema = z.object({
  originId: z.string().min(1),
  destinationId: z.string().min(1),
  travelDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  passengers: z.coerce.number().int().min(1).max(8),
  seatClass: z.enum(SEAT_CLASSES),
});

/** Live fare estimate used by the alert wizard (step 3). */
export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid query" }, { status: 400 });

  const [origin, destination] = await Promise.all([
    db.station.findUnique({ where: { id: parsed.data.originId } }),
    db.station.findUnique({ where: { id: parsed.data.destinationId } }),
  ]);
  if (!origin || !destination) {
    return NextResponse.json({ error: "Unknown station" }, { status: 404 });
  }

  const quote = await getProvider("AMTRAK").getFare({
    originCode: origin.code,
    destinationCode: destination.code,
    travelDate: parsed.data.travelDate,
    passengers: parsed.data.passengers,
    seatClass: parsed.data.seatClass,
    checkedAt: new Date(),
  });

  return NextResponse.json({
    priceCents: quote.available ? quote.priceCents : null,
    source: quote.source,
  });
}
