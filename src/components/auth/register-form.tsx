"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { register } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { FormMessage } from "./form-message";
import { PasswordStrength } from "./password-strength";
import { GoogleButton, OrDivider } from "./login-form";

export function RegisterForm({ googleEnabled }: { googleEnabled?: boolean }) {
  const [state, formAction, pending] = useActionState(register, null);
  const [password, setPassword] = useState("");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Start tracking Amtrak fares in under a minute.</p>
      </div>

      <GoogleButton enabled={googleEnabled} />
      <OrDivider />

      <form action={formAction} className="space-y-4" noValidate>
        <FormMessage state={state} />

        <Field label="Name" error={state?.fieldErrors?.name}>
          {(props) => (
            <Input
              {...props}
              name="name"
              autoComplete="name"
              placeholder="Ada Lovelace"
              required
              error={state?.fieldErrors?.name}
            />
          )}
        </Field>

        <Field label="Email" error={state?.fieldErrors?.email}>
          {(props) => (
            <Input
              {...props}
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              error={state?.fieldErrors?.email}
            />
          )}
        </Field>

        <div>
          <Field label="Password" error={state?.fieldErrors?.password}>
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
          Create account
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
