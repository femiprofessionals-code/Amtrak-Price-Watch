import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { EditAlertForm } from "@/components/alerts/edit-alert-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Edit alert" };

export default async function EditAlertPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;

  const alert = await db.alert.findUnique({
    where: { id },
    include: { route: { include: { origin: true, destination: true } } },
  });
  if (!alert || alert.userId !== user.id) notFound();

  return (
    <div className="animate-fade-in mx-auto max-w-2xl">
      <Link href={`/alerts/${alert.id}`} className="text-[13px] font-medium text-muted-foreground hover:text-foreground">
        ← Back to alert
      </Link>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">Edit alert</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {alert.route.origin.city} → {alert.route.destination.city} · the route can&apos;t be changed —
        create a new alert for a different trip.
      </p>
      <Card className="mt-6">
        <CardContent className="p-6 sm:p-8">
          <EditAlertForm
            alertId={alert.id}
            defaults={{
              travelDate: alert.travelDate.toISOString().slice(0, 10),
              passengers: alert.passengers,
              seatClass: alert.seatClass,
              targetPrice: (alert.targetPriceCents / 100).toFixed(0),
              notifyOnAnyDrop: alert.notifyOnAnyDrop,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
