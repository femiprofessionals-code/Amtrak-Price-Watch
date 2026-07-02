import Link from "next/link";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatCents, formatDate, formatRelative } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PriceChart } from "@/components/charts/price-chart";
import { Sparkline } from "@/components/charts/sparkline";
import { AlertStatusBadge } from "@/components/alerts/status-badge";
import {
  IconAlert,
  IconTrendDown,
  IconTag,
  IconBell,
  IconPlus,
  IconArrowRight,
  IconSearch,
  IconSettings,
} from "@/components/app/icons";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const user = await requireUser();

  const [totalAlerts, activeAlerts, priceDrops, unreadCount, alerts, notifications] =
    await Promise.all([
      db.alert.count({ where: { userId: user.id } }),
      db.alert.count({ where: { userId: user.id, status: { in: ["ACTIVE", "TRIGGERED"] } } }),
      db.notification.count({ where: { userId: user.id, type: "PRICE_DROP" } }),
      db.notification.count({ where: { userId: user.id, readAt: null } }),
      db.alert.findMany({
        where: { userId: user.id },
        include: {
          route: { include: { origin: true, destination: true } },
          priceHistory: { orderBy: { recordedAt: "asc" }, take: 100 },
        },
        orderBy: { createdAt: "desc" },
        take: 6,
      }),
      db.notification.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

  const lowestPrice = alerts.reduce<number | null>(
    (min, a) => (a.lowestPriceCents != null && (min == null || a.lowestPriceCents < min) ? a.lowestPriceCents : min),
    null,
  );

  // Savings: how far below target the fare has fallen, per triggered alert.
  const savings = alerts
    .filter((a) => a.currentPriceCents != null && a.currentPriceCents <= a.targetPriceCents)
    .map((a) => a.targetPriceCents - (a.currentPriceCents ?? 0));
  const avgSavings = savings.length
    ? Math.round(savings.reduce((s, v) => s + v, 0) / savings.length)
    : null;

  const chartAlert = alerts.find((a) => a.priceHistory.length >= 2) ?? alerts[0];

  const stats = [
    { label: "Active alerts", value: String(activeAlerts), icon: <IconAlert />, href: "/alerts" },
    { label: "Price drops", value: String(priceDrops), icon: <IconTrendDown />, href: "/notifications" },
    { label: "Lowest price found", value: formatCents(lowestPrice), icon: <IconTag />, href: "/alerts" },
    { label: "Avg. savings", value: avgSavings != null ? formatCents(avgSavings) : "—", icon: <IconBell />, href: "/alerts" },
  ];

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back, {user.name.split(" ")[0]}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {totalAlerts === 0
              ? "Create your first alert and we'll start watching fares."
              : `Watching ${activeAlerts} of ${totalAlerts} alert${totalAlerts === 1 ? "" : "s"} for you.`}
          </p>
        </div>
        <Link href="/alerts/new">
          <Button>
            <IconPlus className="h-4 w-4" />
            New alert
          </Button>
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="group">
            <Card className="h-full transition-shadow duration-200 group-hover:shadow-lifted">
              <CardContent className="flex items-start justify-between p-5">
                <div>
                  <p className="text-[13px] text-muted-foreground">{s.label}</p>
                  <p className="mt-1.5 text-2xl font-semibold tabular-nums tracking-tight">{s.value}</p>
                </div>
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-soft text-primary [&>svg]:h-[18px] [&>svg]:w-[18px]" aria-hidden>
                  {s.icon}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Price history chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-start justify-between space-y-0">
            <div>
              <CardTitle>Price history</CardTitle>
              <CardDescription>
                {chartAlert
                  ? `${chartAlert.route.origin.city} → ${chartAlert.route.destination.city} · ${formatDate(chartAlert.travelDate)}`
                  : "Your most recent alert will appear here"}
              </CardDescription>
            </div>
            {chartAlert && (
              <Link
                href={`/alerts/${chartAlert.id}`}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-primary hover:underline"
              >
                Details <IconArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {chartAlert ? (
              <PriceChart
                points={chartAlert.priceHistory.map((p) => ({ t: p.recordedAt.getTime(), priceCents: p.priceCents }))}
                targetCents={chartAlert.targetPriceCents}
              />
            ) : (
              <EmptyState
                icon={<IconSearch className="h-5 w-5" />}
                title="No alerts yet"
                description="Create an alert to start recording price history."
                action={
                  <Link href="/alerts/new">
                    <Button size="sm">Create alert</Button>
                  </Link>
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Quick actions + recent notifications */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              <QuickAction href="/alerts/new" icon={<IconPlus />} label="Create a price alert" />
              <QuickAction href="/alerts" icon={<IconAlert />} label="Manage alerts" />
              <QuickAction href="/notifications" icon={<IconBell />} label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"} />
              <QuickAction href="/settings" icon={<IconSettings />} label="Settings" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Recent notifications</CardTitle>
              <Link href="/notifications" className="text-[13px] font-medium text-primary hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="space-y-1">
              {notifications.length === 0 && (
                <p className="py-4 text-center text-sm text-muted-foreground">Nothing yet.</p>
              )}
              {notifications.map((n) => (
                <div key={n.id} className="flex items-start gap-2.5 rounded-lg px-2 py-2 transition-colors hover:bg-muted">
                  <span
                    aria-hidden
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-border" : "bg-primary"}`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium">{n.title}</p>
                    <p className="text-xs text-muted-foreground">{formatRelative(n.createdAt)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent alerts */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent alerts</CardTitle>
          <Link href="/alerts" className="text-[13px] font-medium text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <EmptyState
              icon={<IconAlert className="h-5 w-5" />}
              title="No alerts yet"
              description="Tell us a route and a target price — we'll watch fares around the clock."
              action={
                <Link href="/alerts/new">
                  <Button size="sm">
                    <IconPlus className="h-4 w-4" /> Create your first alert
                  </Button>
                </Link>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {alerts.map((a) => (
                <Link key={a.id} href={`/alerts/${a.id}`} className="group">
                  <div className="h-full rounded-xl border border-border p-4 transition-all duration-150 group-hover:border-primary/40 group-hover:shadow-soft">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-semibold">
                        {a.route.origin.city} → {a.route.destination.city}
                      </p>
                      <AlertStatusBadge status={a.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatDate(a.travelDate)} · {a.passengers} pax
                    </p>
                    <div className="mt-3 flex items-end justify-between gap-2">
                      <div>
                        <p className="text-lg font-semibold tabular-nums leading-none">
                          {formatCents(a.currentPriceCents)}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          target {formatCents(a.targetPriceCents)}
                        </p>
                      </div>
                      <Sparkline values={a.priceHistory.map((p) => p.priceCents)} width={80} height={26} />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function QuickAction({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg border border-border px-3.5 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-muted"
    >
      <span className="text-primary [&>svg]:h-4 [&>svg]:w-4" aria-hidden>
        {icon}
      </span>
      {label}
      <IconArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
    </Link>
  );
}
