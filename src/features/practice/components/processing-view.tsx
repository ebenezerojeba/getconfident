"use client";

import { Check, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { ErrorState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import type { SessionStatus } from "@/generated/prisma/enums";
import { ApiError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";

import { isFailed } from "../state-machine";

const STEPS: { status: SessionStatus[]; label: string }[] = [
  { status: ["PROCESSING"], label: "Upload received" },
  { status: ["TRANSCRIBING"], label: "Transcribing your speech" },
  { status: ["ANALYZING"], label: "Coaching analysis" },
];
const ORDER: SessionStatus[] = ["PROCESSING", "TRANSCRIBING", "ANALYZING", "COMPLETED"];

type StatusResponse = { status: SessionStatus; label: string; failureReason: string | null };

/** Polls session status while it is processed; offers retry on failure. */
export function ProcessingView({
  sessionId,
  initialStatus,
  initialFailure,
}: {
  sessionId: string;
  initialStatus: SessionStatus;
  initialFailure: string | null;
}) {
  const router = useRouter();
  const [state, setState] = useState<StatusResponse>({
    status: initialStatus,
    label: "",
    failureReason: initialFailure,
  });
  const [retrying, setRetrying] = useState(false);
  const [pollError, setPollError] = useState(false);

  useEffect(() => {
    if (isFailed(state.status)) return;
    if (state.status === "COMPLETED") {
      router.replace(`/sessions/${sessionId}`);
      return;
    }
    let cancelled = false;
    let delay = 1500;
    let timer: number;
    const poll = async () => {
      try {
        const next = await apiFetch<StatusResponse>(`/api/sessions/${sessionId}`);
        if (cancelled) return;
        setPollError(false);
        setState(next);
        delay = 1500;
      } catch {
        if (cancelled) return;
        setPollError(true);
        delay = Math.min(delay * 2, 15_000);
      }
      if (!cancelled) timer = window.setTimeout(poll, delay);
    };
    timer = window.setTimeout(poll, delay);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [state.status, sessionId, router]);

  const retry = async () => {
    setRetrying(true);
    try {
      await apiFetch(`/api/sessions/${sessionId}/retry`, { method: "POST" });
      setState((s) => ({ ...s, status: "PROCESSING", failureReason: null }));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't retry right now.");
    } finally {
      setRetrying(false);
    }
  };

  const remove = async () => {
    try {
      await apiFetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      toast.success("Session deleted.");
      router.push("/practice");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't delete the session.");
    }
  };

  if (isFailed(state.status)) {
    return (
      <div className="mx-auto max-w-lg py-10">
        <ErrorState
          title={
            state.status === "TRANSCRIPTION_FAILED"
              ? "Transcription failed"
              : state.status === "ANALYSIS_FAILED"
                ? "Analysis failed"
                : "Processing failed"
          }
          description={
            state.failureReason ??
            "Something went wrong. Your recording is saved, so you can retry."
          }
          onRetry={retry}
          retryLabel={retrying ? "Retrying…" : "Retry"}
        >
          <Button variant="ghost" onClick={remove}>
            Delete session
          </Button>
        </ErrorState>
      </div>
    );
  }

  const currentIndex = ORDER.indexOf(state.status);
  return (
    <div className="mx-auto max-w-md space-y-6 py-10 text-center" role="status" aria-live="polite">
      <div className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-gradient text-white">
        <Loader2 className="size-7 animate-spin motion-reduce:animate-none" aria-hidden="true" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Preparing your feedback</h2>
        <p className="text-sm text-muted-foreground">
          This usually takes under a minute. You can leave this page; we&apos;ll keep working.
        </p>
      </div>
      <ol className="space-y-2 text-left">
        {STEPS.map((step, i) => {
          const done = currentIndex > i;
          const active = currentIndex === i;
          return (
            <li
              key={step.label}
              className={cn(
                "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm",
                active && "border-primary bg-accent/50",
                !done && !active && "text-muted-foreground",
              )}
            >
              {done ? (
                <Check className="size-4 text-success" aria-hidden="true" />
              ) : active ? (
                <Loader2
                  className="size-4 animate-spin text-primary motion-reduce:animate-none"
                  aria-hidden="true"
                />
              ) : (
                <span className="size-4 rounded-full border" aria-hidden="true" />
              )}
              {step.label}
              <span className="sr-only">
                {done ? "(done)" : active ? "(in progress)" : "(pending)"}
              </span>
            </li>
          );
        })}
      </ol>
      {pollError ? (
        <p className="text-sm text-warning-foreground dark:text-warning">
          Having trouble reaching the server. Retrying…
        </p>
      ) : null}
    </div>
  );
}
