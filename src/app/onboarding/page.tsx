import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Logo } from "@/components/layout/logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OnboardingForm } from "@/features/onboarding/onboarding-form";
import { requireUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await requireUser({ allowUnonboarded: true, returnTo: "/onboarding" });
  if (user.onboardedAt) redirect("/dashboard");

  return (
    <div className="min-h-dvh bg-hero-glow">
      <header className="container-page flex h-16 items-center">
        <Logo href="/onboarding" />
      </header>
      <main id="main" className="container-page max-w-3xl py-8 sm:py-12">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold">Let’s set up your practice</CardTitle>
            <CardDescription>
              Three quick questions so your sessions fit your goals. It takes under a minute.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <OnboardingForm defaultName={user.name} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
