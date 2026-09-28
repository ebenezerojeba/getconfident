import { Info } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

import type { Assessment, Basis } from "../schema";

export function scoreTone(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 85) return "text-success";
  if (score >= 65) return "text-primary";
  if (score >= 45) return "text-warning-foreground dark:text-warning";
  return "text-destructive";
}

export function scoreLabel(score: number) {
  if (score >= 90) return "Exceptional";
  if (score >= 75) return "Strong";
  if (score >= 60) return "Developing";
  if (score >= 40) return "Needs work";
  return "Keep practicing";
}

export function ScoreDial({ score, size = 160 }: { score: number; size?: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={r} className="fill-none stroke-muted" strokeWidth="9" />
        <circle
          cx="60"
          cy="60"
          r={r}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          className={cn("fill-none stroke-current", scoreTone(score))}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-semibold tabular-nums" data-testid="overall-score">
          {score}
        </span>
        <span className="text-xs text-muted-foreground">out of 100</span>
      </div>
    </div>
  );
}

const BASIS_LABEL: Record<Basis, { label: string; hint: string }> = {
  observed: {
    label: "Measured",
    hint: "Directly supported by your transcript or measured metrics.",
  },
  inferred: {
    label: "Inferred",
    hint: "A reasonable judgement from your wording; audio delivery isn't heard directly.",
  },
  unavailable: { label: "Not measured", hint: "Can't be assessed from the available data." },
};

export function BasisBadge({ basis }: { basis: Basis }) {
  const b = BASIS_LABEL[basis];
  return (
    <Badge
      variant={basis === "observed" ? "secondary" : "outline"}
      className="gap-1"
      title={b.hint}
    >
      {basis !== "observed" ? <Info className="size-3" aria-hidden="true" /> : null}
      {b.label}
      <span className="sr-only">: {b.hint}</span>
    </Badge>
  );
}

export function AssessmentRow({ label, a }: { label: string; a: Assessment }) {
  return (
    <div className="space-y-1.5 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          <BasisBadge basis={a.basis} />
        </div>
        <span className={cn("text-sm font-semibold tabular-nums", scoreTone(a.score))}>
          {a.score ?? "—"}
        </span>
      </div>
      {a.score !== null ? (
        <div
          className="h-1.5 rounded-full bg-muted"
          role="meter"
          aria-label={`${label} score`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={a.score}
        >
          <div className="h-full rounded-full bg-primary" style={{ width: `${a.score}%` }} />
        </div>
      ) : null}
      <p className="text-sm text-muted-foreground">{a.feedback}</p>
    </div>
  );
}

export function Metric({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
