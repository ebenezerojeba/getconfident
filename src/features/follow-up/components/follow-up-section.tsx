"use client";

import { CheckCircle2, MessageSquarePlus, Mic, Square, Target } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { ErrorState, Spinner } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MEDIA_ERROR_MESSAGES } from "@/features/recording/media";
import { MAX_FUNCTION_UPLOAD_BYTES } from "@/features/recording/constraints";
import { useMediaRecorder } from "@/features/recording/use-media-recorder";
import { ApiError, apiFetch, uploadWithProgress } from "@/lib/api-client";
import { scoreTone } from "@/features/ai-coach/components/report-parts";
import { cn } from "@/lib/utils";

import { type FollowUpEvaluation, followUpEvaluationSchema, MAX_FOLLOW_UPS } from "../schema";

export type FollowUpTurn = {
  order: number;
  question: string;
  answerText: string | null;
  score: number | null;
  evaluation: unknown;
};

function Evaluation({ raw, score }: { raw: unknown; score: number | null }) {
  const parsed = followUpEvaluationSchema.safeParse(raw);
  if (!parsed.success) return null;
  const e: FollowUpEvaluation = parsed.data;
  return (
    <div className="mt-3 space-y-2 rounded-xl bg-muted/60 p-3 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <span className={cn("tabular-nums", scoreTone(score))}>{e.score}/100</span>
        <span className="text-muted-foreground">{e.verdict}</span>
      </p>
      <ul className="space-y-1">
        {e.strengths.map((s) => (
          <li key={s} className="flex gap-2">
            <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden="true" />
            {s}
          </li>
        ))}
        {e.improvements.map((s) => (
          <li key={s} className="flex gap-2">
            <Target className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
            {s}
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Multi-turn follow-up conversation: ask → record answer → evaluate → next. */
export function FollowUpSection({
  sessionId,
  initialTurns,
}: {
  sessionId: string;
  initialTurns: FollowUpTurn[];
}) {
  const [turns, setTurns] = useState<FollowUpTurn[]>(initialTurns);
  const [busy, setBusy] = useState(false);
  const [answering, setAnswering] = useState(false);
  const recorder = useMediaRecorder(false);
  const pending = turns.find((t) => !t.answerText);
  const limitReached = turns.length >= MAX_FOLLOW_UPS && !pending;

  const askNext = async () => {
    setBusy(true);
    try {
      const { question } = await apiFetch<{ question: { order: number; question: string } }>(
        `/api/sessions/${sessionId}/follow-ups`,
        { method: "POST" },
      );
      setTurns((t) =>
        t.some((x) => x.order === question.order)
          ? t
          : [...t, { ...question, answerText: null, score: null, evaluation: null }],
      );
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't get the next question.");
    } finally {
      setBusy(false);
    }
  };

  const startAnswer = async () => {
    if (!(await recorder.requestAccess())) return;
    if (recorder.start()) setAnswering(true);
  };

  const submitAnswer = async () => {
    const result = await recorder.stop();
    setAnswering(false);
    recorder.release();
    if (!result || !pending) return;
    if (result.media.size > MAX_FUNCTION_UPLOAD_BYTES) {
      toast.error("That answer is too long to submit. Keep follow-up answers under 5 minutes.");
      return;
    }
    setBusy(true);
    try {
      const form = new FormData();
      form.set("audio", result.media, "answer.webm");
      const res = (await uploadWithProgress(
        `/api/sessions/${sessionId}/follow-ups/${pending.order}`,
        form,
        () => {},
      )) as { answer: { order: number; answerText: string; score: number; evaluation: unknown } };
      setTurns((t) => t.map((x) => (x.order === res.answer.order ? { ...x, ...res.answer } : x)));
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't submit your answer.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card data-testid="follow-ups">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <MessageSquarePlus className="size-5 text-primary" aria-hidden="true" />
          Follow-up questions
        </CardTitle>
        <CardDescription>
          Keep the conversation going. Answer out loud, just like in a real interview.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ol className="space-y-4">
          {turns.map((t) => (
            <li
              key={t.order}
              className="rounded-xl border p-4"
              data-testid={`follow-up-${t.order}`}
            >
              <div className="flex items-start gap-2">
                <Badge variant="secondary" className="mt-0.5 shrink-0">
                  Q{t.order}
                </Badge>
                <p className="font-medium">{t.question}</p>
              </div>
              {t.answerText ? (
                <>
                  <p className="mt-3 text-sm text-muted-foreground italic">“{t.answerText}”</p>
                  <Evaluation raw={t.evaluation} score={t.score} />
                </>
              ) : null}
            </li>
          ))}
        </ol>

        {recorder.status === "error" && recorder.error ? (
          <ErrorState
            title={MEDIA_ERROR_MESSAGES[recorder.error].title}
            description={MEDIA_ERROR_MESSAGES[recorder.error].description}
            onRetry={startAnswer}
          />
        ) : null}

        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          {pending ? (
            answering ? (
              <>
                <Badge variant="secondary" className="gap-1.5">
                  <span className="size-2 rounded-full bg-destructive motion-safe:animate-pulse" />
                  Recording your answer
                </Badge>
                <Button onClick={submitAnswer} disabled={busy}>
                  <Square /> Finish answer
                </Button>
              </>
            ) : (
              <Button onClick={startAnswer} disabled={busy}>
                <Mic /> Answer question {pending.order}
              </Button>
            )
          ) : limitReached ? (
            <p className="text-sm text-muted-foreground">
              That&apos;s all {MAX_FOLLOW_UPS} follow-ups for this session. Start a new practice to
              keep going.
            </p>
          ) : (
            <Button
              variant={turns.length ? "outline" : "default"}
              onClick={askNext}
              disabled={busy}
            >
              {busy ? <Spinner label="Thinking" /> : <MessageSquarePlus />}
              {turns.length ? "Next question" : "Ask me a follow-up"}
            </Button>
          )}
          {busy && !answering ? <Spinner label="Working" /> : null}
        </div>
      </CardContent>
    </Card>
  );
}
