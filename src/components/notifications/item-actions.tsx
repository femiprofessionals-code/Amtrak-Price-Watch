"use client";

import { useTransition } from "react";
import { markNotificationRead, markAllNotificationsRead } from "@/actions/notifications";
import { Button } from "@/components/ui/button";
import { IconCheck } from "@/components/app/icons";

export function NotificationItemActions({ id, read }: { id: string; read: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => markNotificationRead(id, !read))}
      className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
    >
      {read ? "Mark unread" : "Mark read"}
    </button>
  );
}

export function MarkAllReadButton() {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      loading={pending}
      onClick={() => startTransition(() => markAllNotificationsRead())}
    >
      <IconCheck className="h-4 w-4" />
      Mark all read
    </Button>
  );
}
