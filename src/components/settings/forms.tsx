"use client";

import { useActionState, useEffect, useState } from "react";
import {
  updateProfile,
  changePassword,
  updateNotificationPrefs,
  deleteAccount,
} from "@/actions/profile";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input, Label, Field } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog } from "@/components/ui/dialog";
import { useTheme } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/cn";
import type { ActionState } from "@/actions/types";

function useToastOnResult(state: ActionState) {
  const toast = useToast();
  useEffect(() => {
    if (state?.success) toast("success", state.success);
    else if (state?.error) toast("error", state.error);
  }, [state, toast]);
}

export function ProfileForm({ defaults }: { defaults: { name: string; email: string } }) {
  const [state, formAction, pending] = useActionState(updateProfile, null);
  useToastOnResult(state);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Name" error={state?.fieldErrors?.name}>
        {(p) => <Input {...p} name="name" defaultValue={defaults.name} autoComplete="name" error={state?.fieldErrors?.name} />}
      </Field>
      <Field
        label="Email"
        error={state?.fieldErrors?.email}
        hint="Changing your email will require re-verification."
      >
        {(p) => <Input {...p} name="email" type="email" defaultValue={defaults.email} autoComplete="email" error={state?.fieldErrors?.email} />}
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>Save profile</Button>
      </div>
    </form>
  );
}

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePassword, null);
  useToastOnResult(state);

  return (
    <form action={formAction} className="space-y-4">
      <Field label="Current password" error={state?.fieldErrors?.currentPassword}>
        {(p) => (
          <Input {...p} name="currentPassword" type="password" autoComplete="current-password" error={state?.fieldErrors?.currentPassword} />
        )}
      </Field>
      <Field label="New password" error={state?.fieldErrors?.newPassword}>
        {(p) => (
          <Input {...p} name="newPassword" type="password" autoComplete="new-password" error={state?.fieldErrors?.newPassword} />
        )}
      </Field>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>Change password</Button>
      </div>
    </form>
  );
}

export function NotificationPrefsForm({
  defaults,
}: {
  defaults: { emailOnPriceDrop: boolean; emailOnAlertUpdates: boolean };
}) {
  const [state, formAction, pending] = useActionState(updateNotificationPrefs, null);
  const [priceDrop, setPriceDrop] = useState(defaults.emailOnPriceDrop);
  const [alertUpdates, setAlertUpdates] = useState(defaults.emailOnAlertUpdates);
  useToastOnResult(state);

  return (
    <form action={formAction} className="space-y-4">
      <PrefRow
        title="Price drop alerts"
        description="Email me when a fare drops below my target or falls."
      >
        <Switch checked={priceDrop} onCheckedChange={setPriceDrop} label="Price drop emails" name="emailOnPriceDrop" />
      </PrefRow>
      <PrefRow
        title="Alert activity"
        description="Email me when an alert is created or updated."
      >
        <Switch checked={alertUpdates} onCheckedChange={setAlertUpdates} label="Alert activity emails" name="emailOnAlertUpdates" />
      </PrefRow>
      <div className="flex justify-end">
        <Button type="submit" loading={pending}>Save preferences</Button>
      </div>
    </form>
  );
}

function PrefRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-4">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function ThemeSettings() {
  const { theme, setTheme } = useTheme();
  const options = [
    { value: "light" as const, label: "Light" },
    { value: "dark" as const, label: "Dark" },
    { value: "system" as const, label: "System" },
  ];

  return (
    <div role="radiogroup" aria-label="Theme" className="grid grid-cols-3 gap-3">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={theme === o.value}
          onClick={() => setTheme(o.value)}
          className={cn(
            "rounded-xl border p-4 text-left transition-all",
            theme === o.value
              ? "border-primary bg-primary-soft ring-2 ring-primary/25"
              : "border-border hover:border-primary/40",
          )}
        >
          <ThemePreview mode={o.value} />
          <p className="mt-2.5 text-[13px] font-medium">{o.label}</p>
        </button>
      ))}
    </div>
  );
}

function ThemePreview({ mode }: { mode: "light" | "dark" | "system" }) {
  const light = (
    <div className="h-full w-full rounded-md border border-zinc-200 bg-white p-1.5">
      <div className="h-1.5 w-8 rounded-full bg-zinc-300" />
      <div className="mt-1 h-1.5 w-5 rounded-full bg-indigo-400" />
    </div>
  );
  const dark = (
    <div className="h-full w-full rounded-md border border-zinc-700 bg-zinc-900 p-1.5">
      <div className="h-1.5 w-8 rounded-full bg-zinc-600" />
      <div className="mt-1 h-1.5 w-5 rounded-full bg-indigo-400" />
    </div>
  );
  return (
    <div className="h-12 overflow-hidden rounded-md" aria-hidden>
      {mode === "light" && light}
      {mode === "dark" && dark}
      {mode === "system" && (
        <div className="grid h-full grid-cols-2 gap-1">
          {light}
          {dark}
        </div>
      )}
    </div>
  );
}

export function DangerZone({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteAccount, null);

  return (
    <>
      <Button variant="danger" onClick={() => setOpen(true)}>
        Delete account
      </Button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Delete your account?"
        description="All alerts, price history and notifications will be permanently removed. This can't be undone."
      >
        <form action={formAction} className="space-y-4">
          {state?.error && (
            <p role="alert" className="rounded-lg bg-danger-soft p-3 text-sm font-medium text-danger">
              {state.error}
            </p>
          )}
          <div>
            <Label htmlFor="confirm-email">
              Type <span className="font-semibold">{email}</span> to confirm
            </Label>
            <Input
              id="confirm-email"
              name="confirm"
              autoComplete="off"
              placeholder={email}
              error={state?.fieldErrors?.confirm}
            />
            {state?.fieldErrors?.confirm && (
              <p role="alert" className="mt-1.5 text-xs font-medium text-danger">
                {state.fieldErrors.confirm}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" variant="danger" loading={pending}>
              Permanently delete
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
