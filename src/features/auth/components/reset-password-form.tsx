"use client";

import { useActionState } from "react";

import { Spinner } from "@/components/shared/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { resetPasswordAction } from "@/features/auth/actions";
import { idleState } from "@/lib/actions";
import { PASSWORD_MIN } from "@/lib/validation/auth";

import { ActionField } from "./form-field";
import { PasswordInput } from "./password-input";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPasswordAction, idleState);
  const errors = state.fieldErrors ?? {};
  const formError =
    state.status === "error" && state.message && !errors.password ? state.message : null;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="token" value={token} />

      {formError ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <ActionField
        id="password"
        label="New password"
        errors={errors.password}
        description={`At least ${PASSWORD_MIN} characters. A short phrase works well.`}
      >
        {(p) => <PasswordInput {...p} autoComplete="new-password" required />}
      </ActionField>

      <Button type="submit" size="lg" className="h-11 w-full" disabled={pending}>
        {pending ? <Spinner label="Saving" /> : null}
        {pending ? "Saving..." : "Set new password"}
      </Button>
    </form>
  );
}
