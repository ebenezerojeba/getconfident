import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ResetPasswordForm } from "@/features/auth/components/reset-password-form";
import { findUserForResetToken, INVALID_RESET_LINK_MESSAGE } from "@/lib/auth/service";

export const metadata: Metadata = {
  title: "Choose a new password",
  // Reset links carry a secret; keep them out of referrers and search engines.
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token = "" } = await searchParams;
  const valid = token ? Boolean(await findUserForResetToken(token)) : false;

  return (
    <Card className="shadow-lg shadow-primary/5">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold">
          {valid ? "Choose a new password" : "Link expired"}
        </CardTitle>
        <CardDescription>
          {valid
            ? "You'll be signed out on all devices and can sign in with your new password."
            : INVALID_RESET_LINK_MESSAGE}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {valid ? (
          <ResetPasswordForm token={token} />
        ) : (
          <Button asChild size="lg" className="h-11 w-full">
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
