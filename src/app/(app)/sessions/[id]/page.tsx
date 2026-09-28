import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  FlaskConical,
  Lightbulb,
  Target,
  TrendingUp,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ErrorState } from "@/components/shared/states";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_LABEL, DIFFICULTIES } from "@/config/practice";
import { getMode } from "@/config/practice-modes";
import type { Difficulty, PracticeMode, TopicCategory } from "@/generated/prisma/enums";
import {
  AssessmentRow,
  Metric,
  ScoreDial,
  scoreLabel,
} from "@/features/ai-coach/components/report-parts";
import { SessionActions } from "@/features/ai-coach/components/session-actions";
import { getSessionReport } from "@/features/ai-coach/report-data";
import { DIMENSIONS, TOASTMASTERS_CRITERIA } from "@/features/ai-coach/schema";
import { FollowUpSection } from "@/features/follow-up/components/follow-up-section";
import { highlightTranscript } from "@/features/filler-analysis/highlight";
import { formatClock } from "@/features/practice/timer";
import { requireUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "Session report" };

function Section({
  title,
  icon: Icon,
  children,
  description,
}: {
  title: string;
  icon?: typeof CheckCircle2;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {Icon ? <Icon className="size-5 text-primary" aria-hidden="true" /> : null}
          {title}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function SessionReportPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const result = await getSessionReport(user.id, id);
  if (!result.ok) {
    if (result.reason === "not-found") notFound();
    if (result.reason === "not-ready") redirect(`/practice/${id}`);
    return (
      <ErrorState
        title="This report can't be displayed"
        description="The stored analysis is incomplete. You can delete this session and practice again."
      />
    );
  }

  const { session, report, fillers, speech, transcript, recording, provider } = result.data;
  const mode = getMode(session.mode as PracticeMode);
  const d = report.dimensions;
  const t = report.toastmasters;
  const parts = highlightTranscript(transcript.text, fillers.occurrences);
  const dimension = (key: (typeof DIMENSIONS)[number]["key"]) =>
    DIMENSIONS.find((x) => x.key === key)!.label;

  return (
    <div className="space-y-6">
      {provider === "mock" ? (
        <Alert>
          <FlaskConical className="size-4" />
          <AlertTitle>Development analysis</AlertTitle>
          <AlertDescription>
            This report was produced by the local mock provider (no AI key configured). It
            isn&apos;t real coaching.
          </AlertDescription>
        </Alert>
      ) : null}

      {/* 1. Overall score */}
      <Card className="overflow-hidden">
        <div className="h-1.5 bg-brand-gradient" />
        <CardContent className="grid gap-6 pt-2 md:grid-cols-[auto_1fr] md:items-center">
          <div className="flex justify-center">
            <ScoreDial score={report.overallScore} />
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge>{mode.name}</Badge>
              {session.category ? (
                <Badge variant="outline">{CATEGORY_LABEL[session.category as TopicCategory]}</Badge>
              ) : null}
              <Badge variant="outline">
                {DIFFICULTIES.find((x) => x.id === (session.difficulty as Difficulty))?.label}
              </Badge>
              {session.completedAt ? (
                <Badge variant="outline">
                  {session.completedAt.toLocaleDateString("en", { dateStyle: "medium" })}
                </Badge>
              ) : null}
            </div>
            <h1 className="text-2xl leading-snug font-semibold text-balance">
              {session.topicText}
            </h1>
            <p className="font-medium text-primary">{scoreLabel(report.overallScore)}</p>
            <p className="text-muted-foreground">{report.summary}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 2. What you did well */}
        <Section title="What you did well" icon={CheckCircle2}>
          <ul className="space-y-2">
            {report.strengths.map((s) => (
              <li key={s} className="flex gap-2 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden="true" />
                {s}
              </li>
            ))}
          </ul>
        </Section>
        {/* 3. What to improve */}
        <Section title="What to improve" icon={Target}>
          <ul className="space-y-2">
            {[...report.weaknesses, ...report.suggestions].map((s) => (
              <li key={s} className="flex gap-2 text-sm">
                <ArrowRight className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                {s}
              </li>
            ))}
          </ul>
        </Section>
      </div>

      {/* 4. Speaking metrics */}
      <section aria-labelledby="metrics-heading" className="space-y-3">
        <h2 id="metrics-heading" className="text-lg font-semibold">
          Speaking metrics
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric
            value={speech.wordsPerMinute !== null ? String(Math.round(speech.wordsPerMinute)) : "—"}
            label="Words per minute"
            hint="Comfortable: 130–160"
          />
          <Metric
            value={
              session.elapsedSec !== null ? formatClock(session.elapsedSec * 1000, false) : "—"
            }
            label="Speaking time"
            hint={`Target ${formatClock(session.targetDurationSec * 1000, false)}`}
          />
          <Metric value={String(speech.wordCount)} label="Words" />
          <Metric
            value={String(speech.longPauses.length)}
            label="Long pauses (2s+)"
            hint={speech.longestPauseSec ? `Longest ${speech.longestPauseSec}s` : undefined}
          />
        </div>
      </section>

      {/* 5. Filler words */}
      <Section
        title="Filler words"
        icon={TrendingUp}
        description={`${fillers.totalFillers} detected · ${fillers.fillerPercent}% of words${
          fillers.perMinute !== null ? ` · ${fillers.perMinute} per minute` : ""
        }`}
      >
        <div className="space-y-4">
          {fillers.byFiller.length ? (
            <ul className="flex flex-wrap gap-2" aria-label="Filler word counts">
              {fillers.byFiller.map((f) => (
                <li key={f.filler}>
                  <Badge variant="secondary" className="text-sm">
                    “{f.filler}” × {f.count}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : null}
          {fillers.hasTimeline && speech.durationSec ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Timeline</p>
              <div className="relative h-6 rounded-full bg-muted" aria-hidden="true">
                {fillers.occurrences
                  .filter((o) => o.time !== null)
                  .map((o, i) => (
                    <span
                      key={i}
                      className="absolute top-1 h-4 w-1 rounded-full bg-warning"
                      style={{
                        left: `${Math.min(99, ((o.time ?? 0) / speech.durationSec!) * 100)}%`,
                      }}
                      title={`"${o.filler}" at ${formatClock((o.time ?? 0) * 1000, false)}`}
                    />
                  ))}
              </div>
            </div>
          ) : null}
          <ul className="space-y-1.5">
            {fillers.suggestions.map((s) => (
              <li key={s} className="flex gap-2 text-sm text-muted-foreground">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 6. Structure (Toastmasters-style) */}
        <Section title="Structure" description="Toastmasters-style evaluation">
          <div className="divide-y">
            {(["introduction", "body", "conclusion", "transitions", "timing"] as const).map((k) => (
              <AssessmentRow
                key={k}
                label={TOASTMASTERS_CRITERIA.find((c) => c.key === k)!.label}
                a={t[k]}
              />
            ))}
          </div>
        </Section>
        {/* 8. Delivery */}
        <Section title="Delivery">
          <div className="divide-y">
            {(["confidence", "pace", "pauses", "tone", "energy"] as const).map((k) => (
              <AssessmentRow key={k} label={dimension(k)} a={d[k]} />
            ))}
            <AssessmentRow label="Voice variety" a={t.voiceVariety} />
            <AssessmentRow label="Eye contact" a={t.eyeContact} />
          </div>
        </Section>
      </div>

      {/* 7. Grammar */}
      <Section title="Grammar" description={d.grammar.feedback}>
        {report.grammarCorrections.length ? (
          <ul className="space-y-3">
            {report.grammarCorrections.map((g) => (
              <li key={g.original} className="rounded-xl border p-3 text-sm">
                <p className="text-muted-foreground line-through decoration-destructive/60">
                  {g.original}
                </p>
                <p className="font-medium">{g.corrected}</p>
                <p className="mt-1 text-xs text-muted-foreground">{g.explanation}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No grammar corrections needed.</p>
        )}
      </Section>

      {/* 9. Better examples */}
      {report.betterWording.length ? (
        <Section title="Better wording" description="Your sentences, rewritten">
          <ul className="space-y-3">
            {report.betterWording.map((b) => (
              <li key={b.original} className="rounded-xl border p-3 text-sm">
                <p className="text-muted-foreground">“{b.original}”</p>
                <p className="mt-1 font-medium">→ “{b.improved}”</p>
                <p className="mt-1 text-xs text-muted-foreground">{b.why}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* 10. Homework */}
        <Section title="Homework" icon={BookOpenCheck}>
          <ol className="space-y-3">
            {report.homework.map((h, i) => (
              <li key={h.title} className="text-sm">
                <p className="font-medium">
                  {i + 1}. {h.title}
                </p>
                <p className="text-muted-foreground">{h.description}</p>
              </li>
            ))}
          </ol>
          <div className="mt-4 space-y-1.5 border-t pt-4">
            <p className="text-sm font-medium">Confidence tips</p>
            {report.confidenceTips.map((c) => (
              <p key={c} className="text-sm text-muted-foreground">
                • {c}
              </p>
            ))}
          </div>
        </Section>
        {/* 11. Next challenge */}
        <Section title="Next challenge" icon={ArrowRight}>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              <Badge>{getMode(report.nextPractice.mode).name}</Badge>
              <Badge variant="outline">
                {DIFFICULTIES.find((x) => x.id === report.nextPractice.difficulty)?.label}
              </Badge>
            </div>
            <p className="font-medium">Focus: {report.nextPractice.focus}</p>
            <p className="text-sm text-muted-foreground">{report.nextPractice.reason}</p>
            <Button asChild>
              <Link href="/practice">
                Practice again <ArrowRight />
              </Link>
            </Button>
          </div>
        </Section>
      </div>

      {/* Follow-up conversation */}
      <FollowUpSection
        sessionId={session.id}
        initialTurns={result.data.followUps.map((f) => ({
          order: f.order,
          question: f.question,
          answerText: f.answerText,
          score: f.score,
          evaluation: f.evaluation,
        }))}
      />

      {/* Progressive disclosure: full breakdown */}
      <Card>
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between p-6 font-semibold">
            Full analysis: all {DIMENSIONS.length} dimensions
            <span className="text-sm font-normal text-muted-foreground group-open:hidden">
              Show
            </span>
            <span className="hidden text-sm font-normal text-muted-foreground group-open:inline">
              Hide
            </span>
          </summary>
          <CardContent className="grid gap-x-8 md:grid-cols-2">
            {DIMENSIONS.map((dim) => (
              <AssessmentRow key={dim.key} label={dim.label} a={d[dim.key]} />
            ))}
            {report.modeCriteria.length ? (
              <div className="md:col-span-2">
                <p className="pt-4 text-sm font-semibold">{mode.name} criteria</p>
                {report.modeCriteria.map((m) => (
                  <AssessmentRow
                    key={m.name}
                    label={m.name}
                    a={{ score: m.score, basis: "observed", feedback: m.feedback }}
                  />
                ))}
              </div>
            ) : null}
            <div className="md:col-span-2">
              <p className="pt-4 text-sm font-semibold">Evaluator summary</p>
              <p className="text-sm text-muted-foreground">{t.summary}</p>
              <ul className="mt-2 space-y-1 text-sm">
                {t.recommendations.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </details>
      </Card>

      {/* Recording + transcript */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Recording">
          {recording ? (
            recording.kind === "VIDEO" ? (
              <video
                src={`/api/recordings/${session.id}`}
                controls
                playsInline
                preload="metadata"
                className="aspect-video w-full rounded-xl bg-black"
                aria-label="Session recording"
              />
            ) : (
              <audio
                src={`/api/recordings/${session.id}`}
                controls
                preload="metadata"
                className="w-full"
                aria-label="Session recording"
              />
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              No recording is available for this session.
            </p>
          )}
        </Section>
        <Section title="Transcript" description="Filler words are highlighted">
          <p className="max-h-80 overflow-y-auto text-sm leading-relaxed" data-testid="transcript">
            {parts.map((p, i) =>
              p.filler ? (
                <mark
                  key={i}
                  className="rounded bg-warning/30 px-0.5 text-foreground"
                  title="Filler word"
                >
                  {p.text}
                </mark>
              ) : (
                <span key={i}>{p.text}</span>
              ),
            )}
          </p>
        </Section>
      </div>

      <div className="flex flex-col-reverse justify-between gap-4 border-t pt-6 sm:flex-row sm:items-center">
        <SessionActions sessionId={session.id} hasRecording={Boolean(recording)} />
        <Button asChild size="lg">
          <Link href="/practice">
            Practice again <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
