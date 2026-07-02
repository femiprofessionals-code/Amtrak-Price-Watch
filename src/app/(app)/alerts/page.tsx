import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { formatCents, formatDate, formatRelative } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { AlertStatusBadge } from "@/components/alerts/status-badge";
import { AlertRowActions } from "@/components/alerts/alert-row-actions";
import { Sparkline } from "@/components/charts/sparkline";
import { StatusFilter } from "@/components/alerts/status-filter";
import { IconPlus, IconAlert, IconSearch } from "@/components/app/icons";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Alerts" };

const FILTERS = ["all", "active", "triggered", "paused", "expired"] as const;
type Filter = (typeof FILTERS)[number];

export default async function AlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const filter: Filter = FILTERS.includes(sp.status as Filter) ? (sp.status as Filter) : "all";
  const q = (sp.q ?? "").trim();

  const where: Prisma.AlertWhereInput = {
    userId: user.id,
    ...(filter === "active"
      ? { status: "ACTIVE" as const }
      : filter === "triggered"
        ? { status: "TRIGGERED" as const }
        : filter === "paused"
          ? { status: "PAUSED" as const }
          : filter === "expired"
            ? { status: "EXPIRED" as const }
            : {}),
    ...(q
      ? {
          route: {
            OR: [
              { origin: { city: { contains: q, mode: "insensitive" as const } } },
              { destination: { city: { contains: q, mode: "insensitive" as const } } },
              { origin: { code: { contains: q, mode: "insensitive" as const } } },
              { destination: { code: { contains: q, mode: "insensitive" as const } } },
            ],
          },
        }
      : {}),
  };

  const [alerts, counts] = await Promise.all([
    db.alert.findMany({
      where,
      include: {
        route: { include: { origin: true, destination: true } },
        priceHistory: { orderBy: { recordedAt: "asc" }, take: 50 },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.alert.groupBy({
      by: ["status"],
      where: { userId: user.id },
      _count: true,
    }),
  ]);

  const countFor = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;
  const total = counts.reduce((sum, c) => sum + c._count, 0);

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Alerts</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} alert{total === 1 ? "" : "s"} · {countFor("ACTIVE") + countFor("TRIGGERED")} watching
          </p>
        </div>
        <Link href="/alerts/new">
          <Button>
            <IconPlus className="h-4 w-4" />
            New alert
          </Button>
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatusFilter
          current={filter}
          counts={{
            all: total,
            active: countFor("ACTIVE"),
            triggered: countFor("TRIGGERED"),
            paused: countFor("PAUSED"),
            expired: countFor("EXPIRED"),
          }}
        />
        <form className="relative" action="/alerts" method="GET">
          {filter !== "all" && <input type="hidden" name="status" value={filter} />}
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Search routes…"
            aria-label="Search alerts by city or station code"
            className="h-9 w-56 rounded-lg border border-input bg-card pl-9 pr-3 text-sm shadow-soft placeholder:text-muted-foreground/70 focus:border-ring focus:outline-none focus:ring-2 focus:ring-ring/30"
          />
        </form>
      </div>

      {alerts.length === 0 ? (
        <EmptyState
          icon={<IconAlert className="h-5 w-5" />}
          title={q || filter !== "all" ? "No matching alerts" : "No alerts yet"}
          description={
            q || filter !== "all"
              ? "Try a different search or filter."
              : "Create an alert and we'll watch fares for you around the clock."
          }
          action={
            !q && filter === "all" ? (
              <Link href="/alerts/new">
                <Button size="sm">
                  <IconPlus className="h-4 w-4" /> Create your first alert
                </Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <>
          {/* Desktop table */}
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Route</TH>
                  <TH>Travel date</TH>
                  <TH className="text-right">Current</TH>
                  <TH className="text-right">Target</TH>
                  <TH className="text-right">Lowest</TH>
                  <TH>Trend</TH>
                  <TH>Status</TH>
                  <TH>Checked</TH>
                  <TH className="w-10"><span className="sr-only">Actions</span></TH>
                </TR>
              </THead>
              <TBody>
                {alerts.map((a) => {
                  const belowTarget =
                    a.currentPriceCents != null && a.currentPriceCents <= a.targetPriceCents;
                  return (
                    <TR key={a.id}>
                      <TD>
                        <Link href={`/alerts/${a.id}`} className="font-medium hover:text-primary hover:underline">
                          {a.route.origin.city} → {a.route.destination.city}
                        </Link>
                        <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                          {a.route.origin.code}–{a.route.destination.code} · {a.seatClass.toLowerCase()}
                        </p>
                      </TD>
                      <TD className="whitespace-nowrap text-muted-foreground">{formatDate(a.travelDate)}</TD>
                      <TD className={cn("text-right font-semibold tabular-nums", belowTarget && "text-success")}>
                        {formatCents(a.currentPriceCents)}
                      </TD>
                      <TD className="text-right tabular-nums text-muted-foreground">
                        {formatCents(a.targetPriceCents)}
                      </TD>
                      <TD className="text-right tabular-nums text-muted-foreground">
                        {formatCents(a.lowestPriceCents)}
                      </TD>
                      <TD>
                        <Sparkline values={a.priceHistory.map((p) => p.priceCents)} width={72} height={24} />
                      </TD>
                      <TD>
                        <AlertStatusBadge status={a.status} />
                      </TD>
                      <TD className="whitespace-nowrap text-xs text-muted-foreground">
                        {a.lastCheckedAt ? formatRelative(a.lastCheckedAt) : "—"}
                      </TD>
                      <TD>
                        <AlertRowActions alertId={a.id} status={a.status} route={`${a.route.origin.city} → ${a.route.destination.city}`} />
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </Card>

          {/* Mobile cards */}
          <div className="grid gap-3 md:hidden">
            {alerts.map((a) => (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/alerts/${a.id}`} className="min-w-0">
                    <p className="truncate font-semibold">
                      {a.route.origin.city} → {a.route.destination.city}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(a.travelDate)} · {a.passengers} pax
                    </p>
                  </Link>
                  <AlertRowActions alertId={a.id} status={a.status} route={`${a.route.origin.city} → ${a.route.destination.city}`} />
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold tabular-nums">{formatCents(a.currentPriceCents)}</span>
                    <span className="text-xs text-muted-foreground">/ {formatCents(a.targetPriceCents)} target</span>
                  </div>
                  <AlertStatusBadge status={a.status} />
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
