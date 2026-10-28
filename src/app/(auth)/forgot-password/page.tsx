import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/features/auth/components/forgot-password-form";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Forgot password" };

export default async function ForgotPasswordPage() {
  if (await getCurrentUser()) redirect("/settings");

  return (
    <Card className="shadow-lg shadow-primary/5">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-semibold">Forgot your password?</CardTitle>
        <CardDescription>
          Enter your account email and we&apos;ll send you a link to choose a new one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ForgotPasswordForm />
      </CardContent>
    </Card>
  );
}
