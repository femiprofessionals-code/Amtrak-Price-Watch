import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { logout } from "@/actions/auth";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { SidebarNav, MobileNav, type NavItem } from "@/components/app/nav";
import {
  IconDashboard,
  IconAlert,
  IconBell,
  IconSettings,
  IconLogout,
} from "@/components/app/icons";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const unread = await db.notification.count({ where: { userId: user.id, readAt: null } });

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: <IconDashboard /> },
    { href: "/alerts", label: "Alerts", icon: <IconAlert /> },
    { href: "/notifications", label: "Notifications", icon: <IconBell />, badge: unread },
    { href: "/settings", label: "Settings", icon: <IconSettings /> },
  ];

  const initials = user.name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex min-h-dvh w-full">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-card px-4 py-5 md:flex">
        <Logo href="/dashboard" className="px-2" />
        <div className="mt-8 flex-1">
          <SidebarNav items={items} />
        </div>
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-3 px-2">
            <span
              aria-hidden
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary"
            >
              {initials}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Log out"
                title="Log out"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <IconLogout className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/85 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
          <div className="md:hidden">
            <Logo href="/dashboard" />
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <Link
              href="/notifications"
              aria-label={unread > 0 ? `Notifications (${unread} unread)` : "Notifications"}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <IconBell className="h-[18px] w-[18px]" />
              {unread > 0 && (
                <span aria-hidden className="absolute right-2 top-2 h-2 w-2 rounded-full bg-primary ring-2 ring-background" />
              )}
            </Link>
            <ThemeToggle />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-6 md:pb-10">
          {children}
        </main>
      </div>

      <MobileNav items={items} />
    </div>
  );
}
