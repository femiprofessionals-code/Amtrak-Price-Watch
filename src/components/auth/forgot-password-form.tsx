"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPassword } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { FormMessage } from "./form-message";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(forgotPassword, null);

  if (state?.success) {
    return (
      <div className="animate-scale-in space-y-4 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success-soft text-success">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-6 w-6"
            aria-hidden
          >
            <rect width="20" height="16" x="2" y="4" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
          </svg>
        </span>
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Check your inbox</h1>
          <p role="status" className="text-sm text-muted-foreground">
            {state.success}
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Back to{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            log in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Forgot your password?</h1>
        <p className="text-sm text-muted-foreground">
          Enter your email and we&apos;ll send you a link to reset it.
        </p>
      </div>

      <form action={formAction} className="space-y-4" noValidate>
        <FormMessage state={state} />

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

        <Button type="submit" loading={pending} className="w-full">
          Send reset link
        </Button>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Back to log in
        </Link>
      </p>
    </div>
  );
}
