"use client";

import { ErrorState } from "@/components/shared/states";

export default function DashboardError({ reset }: { error: Error; reset: () => void }) {
  return (
    <ErrorState
      title="We couldn't load your dashboard"
      description="Your data is safe. Please try again in a moment."
      onRetry={reset}
    />
  );
}
