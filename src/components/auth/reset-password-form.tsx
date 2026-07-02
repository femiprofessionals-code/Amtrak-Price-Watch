"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { resetPassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { FormMessage } from "./form-message";
import { PasswordStrength } from "./password-strength";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, null);
  const [password, setPassword] = useState("");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
        <p className="text-sm text-muted-foreground">
          Choose a strong password you haven&apos;t used before.
        </p>
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="token" value={token} />

        <FormMessage state={state} />

        <div>
          <Field label="New password" error={state?.fieldErrors?.password}>
            {(props) => (
              <Input
                {...props}
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={state?.fieldErrors?.password}
              />
            )}
          </Field>
          <PasswordStrength password={password} />
        </div>

        <Button type="submit" loading={pending} className="w-full">
          Reset password
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Back to{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          log in
        </Link>
      </p>
    </div>
  );
}
