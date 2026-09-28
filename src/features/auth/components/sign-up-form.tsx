"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Spinner } from "@/components/shared/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { signUpAction } from "@/features/auth/actions";
import { idleState } from "@/lib/actions";
import { PASSWORD_MIN } from "@/lib/validation/auth";

import { ActionField } from "./form-field";
import { PasswordInput } from "./password-input";

export function SignUpForm() {
  const [state, formAction, pending] = useActionState(signUpAction, idleState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {state.status === "error" && state.message && !Object.keys(errors).length ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <ActionField id="name" label="Name" errors={errors.name}>
        {(p) => (
          <Input
            {...p}
            autoComplete="name"
            required
            maxLength={80}
            defaultValue={state.values?.name}
            className="h-10"
          />
        )}
      </ActionField>

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

      <ActionField
        id="password"
        label="Password"
        description={`At least ${PASSWORD_MIN} characters. A short phrase works well.`}
        errors={errors.password}
      >
        {(p) => (
          <PasswordInput {...p} autoComplete="new-password" required minLength={PASSWORD_MIN} />
        )}
      </ActionField>

      <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
        {pending ? <Spinner label="Creating account" /> : null}
        {pending ? "Creating account..." : "Create account"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
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
