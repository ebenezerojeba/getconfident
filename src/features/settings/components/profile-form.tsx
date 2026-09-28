"use client";

import { useActionState } from "react";

import { Spinner } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActionField } from "@/features/auth/components/form-field";
import { updateProfileAction } from "@/features/settings/profile-actions";
import { idleState } from "@/lib/actions";

import { useActionToast } from "./action-feedback";

export function ProfileForm({
  name,
  email,
  goal,
  timezone,
}: {
  name: string;
  email: string;
  goal: string | null;
  timezone: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, idleState);
  useActionToast(state);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="space-y-5">
      <ActionField
        id="profile-email"
        label="Email"
        description="Your sign-in email can't be changed yet."
      >
        {(p) => <Input {...p} name={undefined} value={email} readOnly disabled className="h-10" />}
      </ActionField>
      <ActionField id="name" label="Name" errors={errors.name}>
        {(p) => <Input {...p} defaultValue={name} required maxLength={80} className="h-10" />}
      </ActionField>
      <ActionField id="goal" label="Speaking goal" errors={errors.goal}>
        {(p) => <Input {...p} defaultValue={goal ?? ""} maxLength={200} className="h-10" />}
      </ActionField>
      <ActionField
        id="timezone"
        label="Time zone"
        description="Used for streaks and daily challenges, e.g. Europe/London."
        errors={errors.timezone}
      >
        {(p) => <Input {...p} defaultValue={timezone} required maxLength={64} className="h-10" />}
      </ActionField>
      <Button type="submit" disabled={pending}>
        {pending ? <Spinner label="Saving" /> : null}
        Save profile
      </Button>
    </form>
  );
}
