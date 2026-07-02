import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import type { NotificationType } from "@/generated/prisma/enums";
import { formatRelative } from "@/lib/format";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { NotificationFilters } from "@/components/notifications/filters";
import { NotificationItemActions, MarkAllReadButton } from "@/components/notifications/item-actions";
import { IconBell, IconTrendDown, IconAlert, IconMail, IconSearch } from "@/components/app/icons";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Notifications" };

const TYPE_FILTERS = ["all", "price_drop", "alert_created", "alert_updated", "system"] as const;
type TypeFilter = (typeof TYPE_FILTERS)[number];

const typeMap: Record<Exclude<TypeFilter, "all">, NotificationType> = {
  price_drop: "PRICE_DROP",
  alert_created: "ALERT_CREATED",
  alert_updated: "ALERT_UPDATED",
  system: "SYSTEM",
};

const typeMeta: Record<NotificationType, { label: string; icon: React.ReactNode; tone: string }> = {
  PRICE_DROP: { label: "Price drop", icon: <IconTrendDown />, tone: "bg-success-soft text-success" },
  ALERT_CREATED: { label: "Alert created", icon: <IconAlert />, tone: "bg-primary-soft text-primary" },
  ALERT_UPDATED: { label: "Alert updated", icon: <IconAlert />, tone: "bg-primary-soft text-primary" },
  SYSTEM: { label: "System", icon: <IconMail />, tone: "bg-muted text-muted-foreground" },
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; q?: string; unread?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const type: TypeFilter = TYPE_FILTERS.includes(sp.type as TypeFilter) ? (sp.type as TypeFilter) : "all";
  const q = (sp.q ?? "").trim();
  const unreadOnly = sp.unread === "1";

  const where: Prisma.NotificationWhereInput = {
    userId: user.id,
    ...(type !== "all" ? { type: typeMap[type] } : {}),
    ...(unreadOnly ? { readAt: null } : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { body: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [notifications, unreadCount] = await Promise.all([
    db.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: 50 }),
    db.notification.count({ where: { userId: user.id, readAt: null } }),
  ]);

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
          </p>
        </div>
        {unreadCount > 0 && <MarkAllReadButton />}
      </div>

      <NotificationFilters current={type} unreadOnly={unreadOnly} q={q} />

      {notifications.length === 0 ? (
        <EmptyState
          icon={q || type !== "all" || unreadOnly ? <IconSearch className="h-5 w-5" /> : <IconBell className="h-5 w-5" />}
          title={q || type !== "all" || unreadOnly ? "No matching notifications" : "No notifications yet"}
          description={
            q || type !== "all" || unreadOnly
              ? "Try a different search or filter."
              : "Price drops and alert activity will show up here."
          }
        />
      ) : (
        <Card className="divide-y divide-border overflow-hidden p-0">
          {notifications.map((n) => {
            const meta = typeMeta[n.type];
            return (
              <div
                key={n.id}
                className={cn(
                  "flex items-start gap-4 px-5 py-4 transition-colors hover:bg-muted/50",
                  !n.readAt && "bg-primary-soft/30",
                )}
              >
                <span
                  className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg [&>svg]:h-4 [&>svg]:w-4", meta.tone)}
                  aria-hidden
                >
                  {meta.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {!n.readAt && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden />}
                    <p className={cn("truncate text-sm", n.readAt ? "font-medium" : "font-semibold")}>
                      {n.alertId ? (
                        <Link href={`/alerts/${n.alertId}`} className="hover:text-primary hover:underline">
                          {n.title}
                        </Link>
                      ) : (
                        n.title
                      )}
                    </p>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">{n.body}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {meta.label} · {formatRelative(n.createdAt)}
                  </p>
                </div>
                <NotificationItemActions id={n.id} read={!!n.readAt} />
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
