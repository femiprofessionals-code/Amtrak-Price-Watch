"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setAlertStatus, deleteAlert, refreshAlert } from "@/actions/alerts";
import { Dropdown, DropdownItem } from "@/components/ui/dropdown";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { IconDots, IconPause, IconPlay, IconTrash, IconEdit, IconRefresh } from "@/components/app/icons";
import type { AlertStatus } from "@/generated/prisma/enums";

export function AlertRowActions({
  alertId,
  status,
  route,
  redirectAfterDelete,
}: {
  alertId: string;
  status: AlertStatus;
  route: string;
  redirectAfterDelete?: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const toast = useToast();
  const router = useRouter();

  const run = (fn: () => Promise<{ error?: string; success?: string } | null>) => {
    startTransition(async () => {
      const result = await fn();
      if (result?.error) toast("error", result.error);
      else if (result?.success) toast("success", result.success);
    });
  };

  return (
    <>
      <Dropdown trigger={<IconDots className="h-4 w-4" />}>
        <DropdownItem onClick={() => router.push(`/alerts/${alertId}/edit`)}>
          <IconEdit className="h-4 w-4" /> Edit
        </DropdownItem>
        <DropdownItem onClick={() => run(() => refreshAlert(alertId))} disabled={pending}>
          <IconRefresh className="h-4 w-4" /> Check price now
        </DropdownItem>
        {(status === "ACTIVE" || status === "TRIGGERED") && (
          <DropdownItem onClick={() => run(() => setAlertStatus(alertId, "PAUSED"))} disabled={pending}>
            <IconPause className="h-4 w-4" /> Pause
          </DropdownItem>
        )}
        {status === "PAUSED" && (
          <DropdownItem onClick={() => run(() => setAlertStatus(alertId, "ACTIVE"))} disabled={pending}>
            <IconPlay className="h-4 w-4" /> Resume
          </DropdownItem>
        )}
        <DropdownItem destructive onClick={() => setConfirmOpen(true)}>
          <IconTrash className="h-4 w-4" /> Delete
        </DropdownItem>
      </Dropdown>

      <Dialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Delete this alert?"
        description={`${route} — this removes the alert and its price history. This can't be undone.`}
      >
        <div className="flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="danger"
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await deleteAlert(alertId);
                if (result?.error) {
                  toast("error", result.error);
                } else {
                  toast("success", "Alert deleted.");
                  setConfirmOpen(false);
                  if (redirectAfterDelete) router.push(redirectAfterDelete);
                }
              })
            }
          >
            Delete alert
          </Button>
        </div>
      </Dialog>
    </>
  );
}
