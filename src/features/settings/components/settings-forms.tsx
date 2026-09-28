"use client";

import { useTheme } from "next-themes";
import { useActionState } from "react";

import { Spinner } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_TIMER_SEC,
  DIFFICULTIES,
  formatTimerOption,
  TIMER_OPTIONS_SEC,
  TOPIC_CATEGORIES,
} from "@/config/practice";
import { PRACTICE_MODES } from "@/config/practice-modes";
import type {
  Difficulty,
  PracticeMode,
  ThemePreference,
  TopicCategory,
} from "@/generated/prisma/enums";
import {
  updateAppearanceAction,
  updateNotificationsAction,
  updatePracticePreferencesAction,
  updatePrivacyAction,
} from "@/features/settings/actions";
import { idleState } from "@/lib/actions";
import { LANGUAGES } from "@/lib/validation/settings";

import { useActionToast } from "./action-feedback";

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-input/30";

function SubmitButton({ pending, children = "Save" }: { pending: boolean; children?: string }) {
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Spinner label="Saving" /> : null}
      {children}
    </Button>
  );
}

export function PracticePreferencesForm({
  preferences,
}: {
  preferences: {
    preferredMode: PracticeMode;
    preferredDifficulty: Difficulty;
    preferredDurationSec: number;
    preferredCategories: TopicCategory[];
    language: string;
  };
}) {
  const [state, action, pending] = useActionState(updatePracticePreferencesAction, idleState);
  useActionToast(state);
  return (
    <form action={action} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="preferredMode">Default mode</Label>
          <select
            id="preferredMode"
            name="preferredMode"
            defaultValue={preferences.preferredMode}
            className={selectClass}
          >
            {PRACTICE_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="preferredDifficulty">Default difficulty</Label>
          <select
            id="preferredDifficulty"
            name="preferredDifficulty"
            defaultValue={preferences.preferredDifficulty}
            className={selectClass}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="preferredDurationSec">Preferred timer</Label>
          <select
            id="preferredDurationSec"
            name="preferredDurationSec"
            defaultValue={preferences.preferredDurationSec || DEFAULT_TIMER_SEC}
            className={selectClass}
          >
            {TIMER_OPTIONS_SEC.map((sec) => (
              <option key={sec} value={sec}>
                {formatTimerOption(sec)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="language">Language</Label>
          <select
            id="language"
            name="language"
            defaultValue={preferences.language}
            className={selectClass}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">
            Used as a transcription hint. The interface is currently English only.
          </p>
        </div>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Preferred topic categories</legend>
        <p className="text-xs text-muted-foreground">
          Random topics favour these when no category is chosen.
        </p>
        <div className="grid gap-2 sm:grid-cols-3">
          {TOPIC_CATEGORIES.map((c) => (
            <Label
              key={c.id}
              className="flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-normal hover:bg-muted has-data-[state=checked]:border-primary has-data-[state=checked]:bg-accent"
            >
              <Checkbox
                name="preferredCategories"
                value={c.id}
                defaultChecked={preferences.preferredCategories.includes(c.id)}
              />
              <span aria-hidden="true">{c.emoji}</span>
              {c.label}
            </Label>
          ))}
        </div>
      </fieldset>
      <SubmitButton pending={pending} />
    </form>
  );
}

export function AppearanceForm({ theme }: { theme: ThemePreference }) {
  const [state, action, pending] = useActionState(updateAppearanceAction, idleState);
  const { setTheme } = useTheme();
  useActionToast(state);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="min-w-48 flex-1 space-y-1.5">
        <Label htmlFor="theme">Theme</Label>
        <select
          id="theme"
          name="theme"
          defaultValue={theme}
          onChange={(e) => setTheme(e.target.value.toLowerCase())}
          className={selectClass}
        >
          <option value="SYSTEM">Match system</option>
          <option value="LIGHT">Light</option>
          <option value="DARK">Dark</option>
        </select>
      </div>
      <SubmitButton pending={pending} />
    </form>
  );
}

export function NotificationsForm({
  preferences,
}: {
  preferences: {
    practiceReminders: boolean;
    reminderHour: number | null;
    weeklySummary: boolean;
    achievementEmails: boolean;
    inAppNotifications: boolean;
  };
}) {
  const [state, action, pending] = useActionState(updateNotificationsAction, idleState);
  useActionToast(state);
  const rows = [
    {
      name: "practiceReminders",
      label: "Daily practice reminder",
      hint: "A nudge to keep your streak alive.",
      checked: preferences.practiceReminders,
    },
    {
      name: "weeklySummary",
      label: "Weekly progress summary",
      hint: "Your scores and trends, once a week.",
      checked: preferences.weeklySummary,
    },
    {
      name: "achievementEmails",
      label: "Achievement emails",
      hint: "When you unlock something new.",
      checked: preferences.achievementEmails,
    },
    {
      name: "inAppNotifications",
      label: "In-app notifications",
      hint: "Shown inside the app.",
      checked: preferences.inAppNotifications,
    },
  ];
  return (
    <form action={action} className="space-y-4">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor={r.name}>{r.label}</Label>
            <p className="text-xs text-muted-foreground">{r.hint}</p>
          </div>
          <Switch id={r.name} name={r.name} defaultChecked={r.checked} />
        </div>
      ))}
      <div className="space-y-1.5">
        <Label htmlFor="reminderHour">Reminder time</Label>
        <select
          id="reminderHour"
          name="reminderHour"
          defaultValue={String(preferences.reminderHour ?? 18)}
          className={selectClass}
        >
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>
              {String(h).padStart(2, "0")}:00
            </option>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">In your profile time zone.</p>
      </div>
      <SubmitButton pending={pending} />
    </form>
  );
}

export function PrivacyForm({ keepRecordings }: { keepRecordings: boolean }) {
  const [state, action, pending] = useActionState(updatePrivacyAction, idleState);
  useActionToast(state);
  return (
    <form action={action} className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Label htmlFor="keepRecordings">Keep my recordings</Label>
          <p className="text-xs text-muted-foreground">
            When off, audio and video are deleted after analysis. Transcripts and reports are kept.
          </p>
        </div>
        <Switch id="keepRecordings" name="keepRecordings" defaultChecked={keepRecordings} />
      </div>
      <SubmitButton pending={pending} />
    </form>
  );
}
