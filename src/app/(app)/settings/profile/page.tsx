import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PasswordForm, SignOutOthersForm } from "@/features/settings/components/password-form";
import { ProfileForm } from "@/features/settings/components/profile-form";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await requireUser();
  const activeSessions = await db.authSession.count({
    where: { userId: user.id, expiresAt: { gt: new Date() } },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Your account details and security." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account</CardTitle>
            <CardDescription>How you appear in the app.</CardDescription>
          </CardHeader>
          <CardContent>
            <ProfileForm
              name={user.name}
              email={user.email}
              goal={user.goal}
              timezone={user.timezone}
            />
          </CardContent>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Password</CardTitle>
              <CardDescription>Changing it signs you out on other devices.</CardDescription>
            </CardHeader>
            <CardContent>
              <PasswordForm />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sessions</CardTitle>
              <CardDescription>
                You’re signed in on {activeSessions} {activeSessions === 1 ? "device" : "devices"}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SignOutOthersForm />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
