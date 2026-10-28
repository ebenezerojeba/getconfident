"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Spinner } from "@/components/shared/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requestPasswordResetAction } from "@/features/auth/actions";
import { idleState } from "@/lib/actions";

import { ActionField } from "./form-field";

export function ForgotPasswordForm() {
  const [state, formAction, pending] = useActionState(requestPasswordResetAction, idleState);
  const errors = state.fieldErrors ?? {};

  if (state.status === "success") {
    return (
      <div className="space-y-5">
        <Alert role="status">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
        <Button asChild variant="outline" size="lg" className="h-11 w-full">
          <Link href="/sign-in">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.status === "error" && state.message && !Object.keys(errors).length ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <ActionField id="email" label="Email" errors={errors.email}>
        {(p) => (
          <Input
            {...p}
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            defaultValue={state.values?.email}
            className="h-10"
          />
        )}
      </ActionField>

      <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
        {pending ? <Spinner label="Sending" /> : null}
        {pending ? "Sending..." : "Send reset link"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Remembered it?{" "}
        <Link
          href="/sign-in"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </form>
  );
}
