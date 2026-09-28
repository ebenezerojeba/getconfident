import {
  Clock,
  Flame,
  Gauge,
  LineChart,
  Mic,
  ShieldCheck,
  SpellCheck,
  Sparkles,
  Timer,
  TrendingDown,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDuration, parseRange, RANGES, type RangeKey } from "@/features/progress/analytics";
import { TrendBars, TrendLine } from "@/features/progress/components/lazy-charts";
import { StatTile } from "@/features/progress/components/stat-tile";
import { getProgress } from "@/features/progress/service";
import { requireUser } from "@/lib/auth/current-user";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Progress" };

function ChartCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await requireUser();
  const range = parseRange((await searchParams).range);
  const [p, allTime] = await Promise.all([
    getProgress(user.id, user.timezone, range),
    // Streaks are always computed over all history.
    getProgress(user.id, user.timezone, "all"),
  ]);
  const label = (i: number) => `#${i + 1}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Progress"
        description="Your trends, derived from every completed session."
      />

      <nav aria-label="Date range" className="flex flex-wrap gap-2">
        {(Object.keys(RANGES) as RangeKey[]).map((key) => (
          <Link
            key={key}
            href={`/progress?range=${key}`}
            aria-current={key === range ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-muted",
              key === range && "border-primary bg-accent text-accent-foreground",
            )}
          >
            {RANGES[key].label}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile icon={Sparkles} label="Sessions completed" value={String(p.totalSessions)} />
        <StatTile
          icon={Gauge}
          label="Average score"
          value={p.averageScore?.toString() ?? "—"}
          hint={
            p.scoreChange !== null
              ? `${p.scoreChange >= 0 ? "+" : ""}${p.scoreChange} early → recent`
              : undefined
          }
        />
        <StatTile
          icon={ShieldCheck}
          label="Avg confidence"
          value={p.averageConfidence?.toString() ?? "—"}
        />
        <StatTile
          icon={SpellCheck}
          label="Avg grammar"
          value={p.averageGrammar?.toString() ?? "—"}
        />
        <StatTile
          icon={TrendingDown}
          label="Filler-word reduction"
          value={p.fillerReductionPct !== null ? `${p.fillerReductionPct}%` : "—"}
          hint={
            p.fillerReductionPct === null
              ? "Needs 10+ sessions in range"
              : "First 5 vs last 5 sessions"
          }
        />
        <StatTile
          icon={Timer}
          label="Average pace"
          value={p.averagePace !== null ? `${p.averagePace} wpm` : "—"}
        />
        <StatTile
          icon={Clock}
          label="Total speaking time"
          value={formatDuration(p.totalSpeakingSec)}
        />
        <StatTile
          icon={Flame}
          label="Current streak"
          value={`${allTime.streak.current} days`}
          hint={`Longest: ${allTime.streak.longest} days`}
        />
      </div>

      {p.totalSessions === 0 ? (
        <EmptyState
          icon={LineChart}
          title="No completed sessions in this range"
          description="Complete a practice session, or pick a wider date range."
        >
          <Button asChild>
            <Link href="/practice">
              <Mic /> Practice now
            </Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartCard title="Overall score" description="Per session">
            <TrendLine
              title="Overall score"
              data={p.series.map((s, i) => ({ label: label(i), value: s.score }))}
            />
          </ChartCard>
          <ChartCard title="Confidence" description="Per session">
            <TrendLine
              title="Confidence"
              data={p.series.map((s, i) => ({ label: label(i), value: s.confidence }))}
            />
          </ChartCard>
          <ChartCard title="Grammar" description="Per session">
            <TrendLine
              title="Grammar"
              data={p.series.map((s, i) => ({ label: label(i), value: s.grammar }))}
            />
          </ChartCard>
          <ChartCard title="Filler words per minute" description="Lower is better">
            <TrendLine
              title="Filler words per minute"
              unit="per min"
              domain={[0, "auto"]}
              data={p.series.map((s, i) => ({ label: label(i), value: s.fillerPerMinute }))}
            />
          </ChartCard>
          <ChartCard title="Pace" description="Words per minute · comfortable range is 130–160">
            <TrendLine
              title="Pace"
              unit="wpm"
              domain={[0, "auto"]}
              data={p.series.map((s, i) => ({ label: label(i), value: s.pace }))}
            />
          </ChartCard>
          <ChartCard title="Sessions per week" description="Last 8 weeks">
            <TrendBars
              title="Sessions per week"
              unit="sessions"
              data={allTime.weekly.map((w) => ({ label: w.label, value: w.sessions }))}
            />
          </ChartCard>
          <ChartCard title="Monthly average score" description="Last 6 months">
            <TrendBars
              title="Monthly average score"
              data={allTime.monthly.map((m) => ({ label: m.label, value: m.avgScore ?? 0 }))}
            />
          </ChartCard>
          <ChartCard title="Monthly speaking time" description="Minutes, last 6 months">
            <TrendBars
              title="Monthly speaking time"
              unit="min"
              data={allTime.monthly.map((m) => ({
                label: m.label,
                value: Math.round(m.speakingSec / 60),
              }))}
            />
          </ChartCard>
        </div>
      )}
    </div>
  );
}
