import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCents, formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { PriceChart } from "@/components/charts/price-chart";
import { AlertStatusBadge } from "@/components/alerts/status-badge";
import { AlertRowActions } from "@/components/alerts/alert-row-actions";
import { CreatedToast } from "@/components/alerts/created-toast";
import { IconTrendDown, IconTrendUp } from "@/components/app/icons";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Alert details" };

const SEAT_LABELS: Record<string, string> = {
  COACH: "Coach",
  BUSINESS: "Business",
  FIRST: "First class",
  ROOMETTE: "Roomette",
};

export default async function AlertDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { created } = await searchParams;

  const alert = await db.alert.findUnique({
    where: { id },
    include: {
      route: { include: { origin: true, destination: true } },
      priceHistory: { orderBy: { recordedAt: "asc" } },
    },
  });
  if (!alert || alert.userId !== user.id) notFound();

  const history = alert.priceHistory;
  const first = history[0]?.priceCents ?? null;
  const current = alert.currentPriceCents;
  const change = first != null && current != null ? current - first : null;
  const belowTarget = current != null && current <= alert.targetPriceCents;

  return (
    <div className="animate-fade-in space-y-6">
      {created === "1" && <CreatedToast />}

      <div>
        <Link href="/alerts" className="text-[13px] font-medium text-muted-foreground hover:text-foreground">
          ← Back to alerts
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight">
                {alert.route.origin.city} → {alert.route.destination.city}
              </h1>
              <AlertStatusBadge status={alert.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {alert.route.origin.name} ({alert.route.origin.code}) →{" "}
              {alert.route.destination.name} ({alert.route.destination.code})
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {formatDate(alert.travelDate)} · {alert.passengers}{" "}
              {alert.passengers === 1 ? "passenger" : "passengers"} · {SEAT_LABELS[alert.seatClass]}
            </p>
          </div>
          <AlertRowActions
            alertId={alert.id}
            status={alert.status}
            route={`${alert.route.origin.city} → ${alert.route.destination.city}`}
            redirectAfterDelete="/alerts"
          />
        </div>
      </div>

      {/* Price summary */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Current price"
          value={formatCents(current)}
          accent={belowTarget ? "success" : undefined}
          sub={alert.lastCheckedAt ? `checked ${formatRelative(alert.lastCheckedAt)}` : "not checked yet"}
        />
        <StatCard label="Target price" value={formatCents(alert.targetPriceCents)} sub={alert.notifyOnAnyDrop ? "notify on any drop" : "notify at target"} />
        <StatCard label="Lowest seen" value={formatCents(alert.lowestPriceCents)} sub={`${history.length} checks recorded`} />
        <StatCard
          label="Since first check"
          value={change != null ? `${change < 0 ? "−" : change > 0 ? "+" : ""}${formatCents(Math.abs(change))}` : "—"}
          accent={change != null && change < 0 ? "success" : change != null && change > 0 ? "danger" : undefined}
          icon={change != null ? (change < 0 ? <IconTrendDown /> : change > 0 ? <IconTrendUp /> : undefined) : undefined}
          sub={first != null ? `started at ${formatCents(first)}` : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Price history</CardTitle>
          <CardDescription>
            Every fare check for this trip. The dashed line is your target.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PriceChart
            points={history.map((p) => ({ t: p.recordedAt.getTime(), priceCents: p.priceCents }))}
            targetCents={alert.targetPriceCents}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent checks</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No checks recorded yet.</p>
          ) : (
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>When</TH>
                  <TH className="text-right">Price</TH>
                  <TH className="text-right">vs. target</TH>
                </TR>
              </THead>
              <TBody>
                {[...history]
                  .reverse()
                  .slice(0, 12)
                  .map((h) => {
                    const diff = h.priceCents - alert.targetPriceCents;
                    return (
                      <TR key={h.id}>
                        <TD className="text-muted-foreground">{formatDateTime(h.recordedAt)}</TD>
                        <TD className="text-right font-medium tabular-nums">{formatCents(h.priceCents)}</TD>
                        <TD
                          className={cn(
                            "text-right tabular-nums",
                            diff <= 0 ? "text-success" : "text-muted-foreground",
                          )}
                        >
                          {diff <= 0 ? `${formatCents(Math.abs(diff))} under` : `+${formatCents(diff)}`}
                        </TD>
                      </TR>
                    );
                  })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "success" | "danger";
  icon?: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-[13px] text-muted-foreground">{label}</p>
        <p
          className={cn(
            "mt-1.5 flex items-center gap-1.5 text-2xl font-semibold tabular-nums tracking-tight",
            accent === "success" && "text-success",
            accent === "danger" && "text-danger",
          )}
        >
          {icon && <span className="[&>svg]:h-5 [&>svg]:w-5" aria-hidden>{icon}</span>}
          {value}
        </p>
        {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}
