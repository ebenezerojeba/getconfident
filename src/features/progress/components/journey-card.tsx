import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { Journey } from "../journey";

function Change({
  value,
  suffix = "",
  better,
}: {
  value: number;
  suffix?: string;
  better: boolean;
}) {
  if (value === 0) return <span className="text-xs text-muted-foreground">No change</span>;
  const Icon = value > 0 ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold",
        better ? "text-success" : "text-muted-foreground",
      )}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {value > 0 ? "+" : ""}
      {value}
      {suffix}
    </span>
  );
}

function Metric({
  label,
  start,
  now,
  change,
}: {
  label: string;
  start: string;
  now: string;
  change: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5 rounded-xl bg-muted/50 p-3">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="flex items-baseline gap-2 tabular-nums">
        <span className="text-sm text-muted-foreground">{start}</span>
        <ArrowRight className="size-3.5 self-center text-muted-foreground" aria-label="to" />
        <span className="text-2xl font-semibold">{now}</span>
      </p>
      {change}
    </div>
  );
}

/** "Since day one": the first session (starting assessment) vs recent sessions. */
export function JourneyCard({ journey }: { journey: Journey }) {
  const since = journey.startedAt.toLocaleDateString("en", { month: "short", day: "numeric" });
  const { start, now } = journey;

  return (
    <Card data-testid="journey-card">
      <CardHeader>
        <CardTitle className="text-lg">Your journey</CardTitle>
        <CardDescription>
          {now
            ? `Day one (${since}) vs your last ${Math.min(journey.sessionsSince, 3)} session${journey.sessionsSince === 1 ? "" : "s"}`
            : `Starting assessment · ${since}`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-base font-medium text-balance" data-testid="journey-highlight">
          {journey.highlight}
        </p>
        {now ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <Metric
              label="Overall score"
              start={String(start.score)}
              now={String(now.score)}
              change={<Change value={journey.scoreDelta!} better={journey.scoreDelta! > 0} />}
            />
            <Metric
              label="Filler words / min"
              start={String(start.fillerPerMinute)}
              now={String(now.fillerPerMinute)}
              change={
                journey.fillerReductionPct !== null ? (
                  <Change
                    value={-journey.fillerReductionPct}
                    suffix="%"
                    better={journey.fillerReductionPct > 0}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">Already filler-free</span>
                )
              }
            />
            <Metric
              label="Confidence"
              start={String(start.confidence)}
              now={String(now.confidence)}
              change={
                <Change value={journey.confidenceDelta!} better={journey.confidenceDelta! > 0} />
              }
            />
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-semibold tabular-nums">{start.score}</span>
              <span className="text-sm text-muted-foreground">starting score</span>
            </div>
            <Button asChild>
              <Link href="/practice">Practise again</Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
