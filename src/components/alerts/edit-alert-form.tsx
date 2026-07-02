"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { updateAlert } from "@/actions/alerts";
import { toDateInputValue } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";

const SEAT_LABELS: Record<string, string> = {
  COACH: "Coach",
  BUSINESS: "Business",
  FIRST: "First class",
  ROOMETTE: "Roomette",
};

export function EditAlertForm({
  alertId,
  defaults,
}: {
  alertId: string;
  defaults: {
    travelDate: string;
    passengers: number;
    seatClass: string;
    targetPrice: string;
    notifyOnAnyDrop: boolean;
  };
}) {
  const action = updateAlert.bind(null, alertId);
  const [state, formAction, pending] = useActionState(action, null);
  const [notifyOnAnyDrop, setNotifyOnAnyDrop] = useState(defaults.notifyOnAnyDrop);
  const toast = useToast();
  const router = useRouter();
  const minDate = useMemo(() => toDateInputValue(new Date()), []);

  useEffect(() => {
    if (state?.success) {
      toast("success", state.success);
      router.push(`/alerts/${alertId}`);
    }
  }, [state, toast, router, alertId]);

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <div role="alert" className="rounded-lg bg-danger-soft p-3 text-sm font-medium text-danger">
          {state.error}
        </div>
      )}

      <div>
        <Label htmlFor="edit-date">Travel date</Label>
        <Input
          id="edit-date"
          name="travelDate"
          type="date"
          min={minDate}
          defaultValue={defaults.travelDate}
          error={state?.fieldErrors?.travelDate}
        />
        {state?.fieldErrors?.travelDate && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
            {state.fieldErrors.travelDate}
          </p>
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="edit-passengers">Passengers</Label>
          <Select id="edit-passengers" name="passengers" defaultValue={defaults.passengers}>
            {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? "passenger" : "passengers"}
              </option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="edit-class">Seat type</Label>
          <Select id="edit-class" name="seatClass" defaultValue={defaults.seatClass}>
            {Object.entries(SEAT_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="edit-target">Target price (USD, per ticket)</Label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            id="edit-target"
            name="targetPrice"
            type="number"
            inputMode="decimal"
            min={1}
            step="1"
            className="pl-7"
            defaultValue={defaults.targetPrice}
            error={state?.fieldErrors?.targetPriceCents}
          />
        </div>
        {state?.fieldErrors?.targetPriceCents && (
          <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
            {state.fieldErrors.targetPriceCents}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border p-4">
        <div>
          <p className="text-sm font-medium">Also notify on any price drop</p>
          <p className="text-xs text-muted-foreground">
            Get an email whenever the fare falls, even above your target.
          </p>
        </div>
        <Switch
          checked={notifyOnAnyDrop}
          onCheckedChange={setNotifyOnAnyDrop}
          label="Notify on any price drop"
          name="notifyOnAnyDrop"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={pending}>
          Cancel
        </Button>
        <Button type="submit" loading={pending}>
          Save changes
        </Button>
      </div>
    </form>
  );
}
