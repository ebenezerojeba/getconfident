import {
  ArrowRight,
  CalendarCheck,
  Clock,
  Flame,
  Gauge,
  Lightbulb,
  Mic,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { NamedIcon } from "@/components/shared/icon";
import { EmptyState } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_LABEL, DIFFICULTIES } from "@/config/practice";
import { getMode } from "@/config/practice-modes";
import { ACHIEVEMENTS } from "@/features/achievements/catalog";
import { coachReportSchema } from "@/features/ai-coach/schema";
import { SessionList } from "@/features/practice/components/recent-sessions";
import { formatDuration } from "@/features/progress/analytics";
import { TrendBars, TrendLine } from "@/features/progress/components/lazy-charts";
import { StatTile } from "@/features/progress/components/stat-tile";
import { getProgress, getRecentSessions } from "@/features/progress/service";
import { getDailyChallenge } from "@/features/topics/service";
import { requireUser } from "@/lib/auth/current-user";
import { db } from "@/lib/db/client";

export const metadata: Metadata = { title: "Dashboard" };

const recommendationSchema = coachReportSchema.pick({ nextPractice: true, homework: true });

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ welcome?: string }>;
}) {
  const user = await requireUser();
  const { welcome } = await searchParams;
  const [progress, recent, daily, latest, unlocked] = await Promise.all([
    getProgress(user.id, user.timezone, "all"),
    getRecentSessions(user.id, 5),
    getDailyChallenge(user.timezone),
    db.speakingAnalysis.findFirst({
      where: { session: { userId: user.id, status: "COMPLETED" } },
      orderBy: { createdAt: "desc" },
      select: { report: true },
    }),
    db.userAchievement.findMany({
      where: { userId: user.id },
      orderBy: { unlockedAt: "desc" },
      select: { achievementId: true, unlockedAt: true },
    }),
  ]);
  const firstName = user.name.split(" ")[0];
  const rec = latest ? recommendationSchema.safeParse(latest.report) : null;
  const recentAchievements = unlocked
    .slice(0, 3)
    .map((u) => ACHIEVEMENTS.find((a) => a.id === u.achievementId))
    .filter(Boolean);
  const hasData = progress.totalSessions > 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold sm:text-3xl">
            {welcome ? `Welcome, ${firstName}!` : `Welcome back, ${firstName}`}
          </h1>
          <p className="text-muted-foreground">
            {progress.streak.practicedToday
              ? "You've practiced today. Nice work, keep the streak alive tomorrow."
              : progress.streak.current > 0
                ? `Practice today to extend your ${progress.streak.current}-day streak.`
                : "A few minutes of practice a day builds real confidence."}
          </p>
        </div>
        <Button asChild size="lg" className="h-11">
          <Link href="/practice">
            <Mic /> Start practicing
          </Link>
        </Button>
      </div>

      {/* Daily challenge */}
      {daily ? (
        <Card className="overflow-hidden">
          <div className="h-1.5 bg-brand-gradient" />
          <CardContent className="flex flex-col gap-4 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <p className="flex items-center gap-2 text-sm font-semibold text-primary">
                <CalendarCheck className="size-4" aria-hidden="true" /> Today&apos;s challenge
              </p>
              <p className="text-lg font-semibold text-balance" data-testid="daily-challenge">
                {daily.text}
              </p>
              <p className="text-xs text-muted-foreground">
                {CATEGORY_LABEL[daily.category]} ·{" "}
                {DIFFICULTIES.find((d) => d.id === daily.difficulty)?.label} · 1 minute
              </p>
            </div>
            <Button asChild variant="outline" className="shrink-0">
              <Link href="/practice?mode=DAILY_CHALLENGE">
                Take the challenge <ArrowRight />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Stats */}
      <section aria-labelledby="stats-heading" className="space-y-3">
        <h2 id="stats-heading" className="sr-only">
          Your statistics
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <StatTile icon={Sparkles} label="Sessions" value={String(progress.totalSessions)} />
          <StatTile
            icon={Gauge}
            label="Average score"
            value={progress.averageScore !== null ? String(progress.averageScore) : "—"}
            hint={
              progress.scoreChange !== null
                ? `${progress.scoreChange >= 0 ? "+" : ""}${progress.scoreChange} vs your first sessions`
                : undefined
            }
          />
          <StatTile
            icon={ShieldCheck}
            label="Confidence"
            value={progress.averageConfidence !== null ? String(progress.averageConfidence) : "—"}
          />
          <StatTile
            icon={Clock}
            label="Speaking time"
            value={formatDuration(progress.totalSpeakingSec)}
          />
          <StatTile
            icon={Flame}
            label="Streak"
            value={`${progress.streak.current} ${progress.streak.current === 1 ? "day" : "days"}`}
            hint={`Longest: ${progress.streak.longest}`}
          />
        </div>
      </section>

      {!hasData ? (
        <EmptyState
          icon={Mic}
          title="Your progress will appear here"
          description="Complete your first practice session to see scores, trends and filler-word stats."
        >
          <Button asChild>
            <Link href="/practice">Start your first session</Link>
          </Button>
        </EmptyState>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Score by session</CardTitle>
              <CardDescription>Overall score, most recent 20 sessions</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendLine
                title="Score by session"
                data={progress.series
                  .slice(-20)
                  .map((p, i) => ({ label: `#${i + 1}`, value: p.score }))}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Filler words per minute</CardTitle>
              <CardDescription>
                Lower is better
                {progress.fillerReductionPct !== null
                  ? ` · ${progress.fillerReductionPct >= 0 ? "down" : "up"} ${Math.abs(progress.fillerReductionPct)}% since you started`
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TrendLine
                title="Filler words per minute"
                unit="per min"
                domain={[0, "auto"]}
                data={progress.series
                  .slice(-20)
                  .map((p, i) => ({ label: `#${i + 1}`, value: p.fillerPerMinute }))}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sessions per week</CardTitle>
              <CardDescription>Last 8 weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendBars
                title="Sessions per week"
                unit="sessions"
                data={progress.weekly.map((w) => ({ label: w.label, value: w.sessions }))}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Monthly average score</CardTitle>
              <CardDescription>Last 6 months</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendBars
                title="Monthly average score"
                data={progress.monthly.map((m) => ({ label: m.label, value: m.avgScore ?? 0 }))}
              />
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="recent-heading" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 id="recent-heading" className="text-lg font-semibold">
              Recent sessions
            </h2>
            {recent.length ? (
              <Button asChild variant="ghost" size="sm">
                <Link href="/history">View all</Link>
              </Button>
            ) : null}
          </div>
          {recent.length ? (
            <SessionList sessions={recent} />
          ) : (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              No sessions yet.
            </p>
          )}
        </section>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="size-4 text-primary" aria-hidden="true" /> Recommended next
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {rec?.success ? (
                <>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge>{getMode(rec.data.nextPractice.mode).name}</Badge>
                    <Badge variant="outline">
                      {DIFFICULTIES.find((d) => d.id === rec.data.nextPractice.difficulty)?.label}
                    </Badge>
                  </div>
                  <p className="font-medium">Focus: {rec.data.nextPractice.focus}</p>
                  <p className="text-muted-foreground">{rec.data.homework[0]?.description}</p>
                </>
              ) : (
                <p className="text-muted-foreground">
                  Start with an Impromptu session on an easy topic. Your coach will tailor
                  recommendations after each session.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Trophy className="size-4 text-primary" aria-hidden="true" /> Achievements
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  {unlocked.length}/{ACHIEVEMENTS.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentAchievements.length ? (
                <ul className="space-y-2">
                  {recentAchievements.map((a) => (
                    <li key={a!.id} className="flex items-center gap-3 text-sm">
                      <span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                        <NamedIcon name={a!.icon} className="size-4" />
                      </span>
                      {a!.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Complete your first session to unlock your first achievement.
                </p>
              )}
              <Button asChild variant="ghost" size="sm" className="-ml-2">
                <Link href="/achievements">See all achievements</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
