"use client";

import { useActionState, useEffect, useState } from "react";

import { Spinner } from "@/components/shared/states";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_TIMER_SEC,
  formatTimerOption,
  SPEAKING_GOALS,
  TIMER_OPTIONS_SEC,
  TOPIC_CATEGORIES,
} from "@/config/practice";
import { ActionField } from "@/features/auth/components/form-field";
import { completeOnboardingAction } from "@/features/onboarding/actions";
import { idleState } from "@/lib/actions";
import { cn } from "@/lib/utils";

const chip =
  "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors hover:bg-muted has-checked:border-primary has-checked:bg-accent has-checked:text-accent-foreground has-focus-visible:ring-3 has-focus-visible:ring-ring/50";

export function OnboardingForm({ defaultName }: { defaultName: string }) {
  const [state, formAction, pending] = useActionState(completeOnboardingAction, idleState);
  const errors = state.fieldErrors ?? {};
  const [timezone, setTimezone] = useState("UTC");

  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
  }, []);

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="timezone" value={timezone} />

      {state.status === "error" && state.message ? (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <ActionField id="name" label="What should we call you?" errors={errors.name}>
        {(p) => (
          <Input
            {...p}
            defaultValue={defaultName}
            required
            maxLength={80}
            autoComplete="name"
            className="h-10"
          />
        )}
      </ActionField>

      <FieldSet>
        <FieldLegend>What’s your main goal?</FieldLegend>
        <div className="grid gap-2 sm:grid-cols-2">
          {SPEAKING_GOALS.map((g, i) => (
            <label key={g.id} className={chip}>
              <input
                type="radio"
                name="goal"
                value={g.label}
                defaultChecked={i === 0}
                className="accent-primary"
              />
              {g.label}
            </label>
          ))}
        </div>
        <FieldError errors={errors.goal?.map((message) => ({ message }))} />
      </FieldSet>

      <FieldSet>
        <FieldLegend>Default practice length</FieldLegend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {TIMER_OPTIONS_SEC.map((sec) => (
            <label key={sec} className={cn(chip, "justify-center")}>
              <input
                type="radio"
                name="preferredDurationSec"
                value={sec}
                defaultChecked={sec === DEFAULT_TIMER_SEC}
                className="sr-only"
              />
              {formatTimerOption(sec)}
            </label>
          ))}
        </div>
        <FieldError errors={errors.preferredDurationSec?.map((message) => ({ message }))} />
      </FieldSet>

      <FieldSet>
        <FieldLegend>Topics you enjoy (optional)</FieldLegend>
        <p className="-mt-2 text-sm text-muted-foreground">
          We’ll favour these when picking random topics. You can change them anytime.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {TOPIC_CATEGORIES.map((c) => (
            <label key={c.id} className={chip}>
              <input
                type="checkbox"
                name="preferredCategories"
                value={c.id}
                className="accent-primary"
              />
              <span aria-hidden="true">{c.emoji}</span>
              {c.label}
            </label>
          ))}
        </div>
      </FieldSet>

      <Button type="submit" size="lg" className="h-11 w-full sm:w-auto" disabled={pending}>
        {pending ? <Spinner label="Saving" /> : null}
        {pending ? "Saving..." : "Continue to dashboard"}
      </Button>
    </form>
  );
}
