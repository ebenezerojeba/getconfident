"use client";

import { useEffect } from "react";

import { ErrorState } from "@/components/shared/states";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app:error]", error.digest ?? error.message);
  }, [error]);

  return (
    <main id="main" className="container-page flex min-h-[60dvh] items-center justify-center py-16">
      <ErrorState
        className="w-full max-w-lg"
        description="An unexpected error occurred. Your data is safe. Try again, or come back in a moment."
        onRetry={reset}
      />
    </main>
  );
}
