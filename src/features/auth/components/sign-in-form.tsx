"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Spinner } from "@/components/shared/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signInAction } from "@/features/auth/actions";
import { idleState } from "@/lib/actions";

import { ActionField } from "./form-field";
import { PasswordInput } from "./password-input";

export function SignInForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, formAction, pending] = useActionState(signInAction, idleState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      {state.status === "error" && state.message && !Object.keys(errors).length ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : notice && state.status === "idle" ? (
        <Alert role="status">
          <AlertDescription>{notice}</AlertDescription>
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

      <ActionField id="password" label="Password" errors={errors.password}>
        {(p) => <PasswordInput {...p} autoComplete="current-password" required />}
      </ActionField>

      <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
        {pending ? <Spinner label="Signing in" /> : null}
        {pending ? "Signing in..." : "Sign in"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href="/sign-up"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </form>
  );
}
