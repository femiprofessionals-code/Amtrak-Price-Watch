import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { AlertWizard } from "@/components/alerts/alert-wizard";

export const metadata: Metadata = { title: "New alert" };

export default async function NewAlertPage() {
  await requireUser();
  const stations = await db.station.findMany({
    orderBy: [{ city: "asc" }],
    select: { id: true, code: true, name: true, city: true, state: true },
  });

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <h1 className="text-2xl font-semibold tracking-tight">Create a price alert</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tell us your trip and target price — we&apos;ll watch fares around the clock.
      </p>
      <div className="mt-6">
        <AlertWizard stations={stations} />
      </div>
    </div>
  );
}
