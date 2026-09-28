"use client";

import { useActionState, useEffect, useRef } from "react";

import { Spinner } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { changePasswordAction, signOutOtherSessionsAction } from "@/features/auth/actions";
import { ActionField } from "@/features/auth/components/form-field";
import { PasswordInput } from "@/features/auth/components/password-input";
import { idleState } from "@/lib/actions";
import { PASSWORD_MIN } from "@/lib/validation/auth";

import { useActionToast } from "./action-feedback";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, idleState);
  useActionToast(state);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-5">
      <ActionField id="currentPassword" label="Current password" errors={errors.currentPassword}>
        {(p) => <PasswordInput {...p} autoComplete="current-password" required />}
      </ActionField>
      <ActionField
        id="newPassword"
        label="New password"
        description={`At least ${PASSWORD_MIN} characters.`}
        errors={errors.newPassword}
      >
        {(p) => (
          <PasswordInput {...p} autoComplete="new-password" required minLength={PASSWORD_MIN} />
        )}
      </ActionField>
      <Button type="submit" disabled={pending}>
        {pending ? <Spinner label="Updating" /> : null}
        Update password
      </Button>
    </form>
  );
}

export function SignOutOthersForm() {
  const [state, formAction, pending] = useActionState(signOutOtherSessionsAction, idleState);
  useActionToast(state);
  return (
    <form action={formAction}>
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? <Spinner label="Signing out" /> : null}
        Sign out other devices
      </Button>
    </form>
  );
}
