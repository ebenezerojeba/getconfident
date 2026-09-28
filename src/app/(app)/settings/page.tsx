import { AlertTriangle, Bell, Palette, ShieldCheck, Sliders, User } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteAccountDialog, ExportDataButton } from "@/features/settings/components/danger-zone";
import {
  AppearanceForm,
  NotificationsForm,
  PracticePreferencesForm,
  PrivacyForm,
} from "@/features/settings/components/settings-forms";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Settings" };

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: typeof Bell;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-primary" aria-hidden="true" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function SettingsPage() {
  const user = await requireUser();
  const prefs =
    (await db.userPreferences.findUnique({ where: { userId: user.id } })) ??
    (await db.userPreferences.create({ data: { userId: user.id } }));

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Practice defaults, notifications and your data." />

      <Section
        icon={Sliders}
        title="Practice"
        description="Defaults used when you start a session."
      >
        <PracticePreferencesForm
          preferences={{
            preferredMode: prefs.preferredMode,
            preferredDifficulty: prefs.preferredDifficulty,
            preferredDurationSec: prefs.preferredDurationSec,
            preferredCategories: prefs.preferredCategories,
            language: prefs.language,
          }}
        />
      </Section>

      <Section
        icon={Palette}
        title="Appearance"
        description="Saved to your account, so it follows you across devices."
      >
        <AppearanceForm theme={prefs.theme} />
      </Section>

      <Section icon={Bell} title="Notifications" description="Choose what we send you and when.">
        <NotificationsForm
          preferences={{
            practiceReminders: prefs.practiceReminders,
            reminderHour: prefs.reminderHour,
            weeklySummary: prefs.weeklySummary,
            achievementEmails: prefs.achievementEmails,
            inAppNotifications: prefs.inAppNotifications,
          }}
        />
      </Section>

      <Section icon={ShieldCheck} title="Privacy" description="You control what we keep.">
        <PrivacyForm keepRecordings={prefs.keepRecordings} />
      </Section>

      <Section
        icon={User}
        title="Account & security"
        description="Your name, password and active sessions."
      >
        <Button asChild variant="outline">
          <Link href="/settings/profile">Open profile & security</Link>
        </Button>
      </Section>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="size-4" aria-hidden="true" />
            Your data
          </CardTitle>
          <CardDescription>
            Export everything we store, or delete your account permanently.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <ExportDataButton />
          <DeleteAccountDialog />
        </CardContent>
      </Card>
    </div>
  );
}
