"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  CheckCircle2,
  Mic,
  MicOff,
  Pause,
  Play,
  RotateCcw,
  Square,
  Trash2,
  Upload,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { ErrorState, Spinner } from "@/components/shared/states";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatTimerOption } from "@/config/practice";
import { MAX_FUNCTION_UPLOAD_BYTES, MAX_RECORDING_BYTES } from "@/features/recording/constraints";
import { uploadInChunks } from "@/features/recording/chunked-upload";
import { uploadToStorage } from "@/features/recording/direct-upload";
import { MEDIA_ERROR_MESSAGES } from "@/features/recording/media";
import { useAudioLevel } from "@/features/recording/use-audio-level";
import { useLiveCoach } from "@/features/recording/use-live-coach";
import { type RecordingResult, useMediaRecorder } from "@/features/recording/use-media-recorder";
import { ApiError, apiFetch, uploadWithProgress } from "@/lib/api-client";
import { cn } from "@/lib/utils";

import { formatClock } from "../timer";
import { useTimer } from "../use-timer";
import { LiveCoachPanel, LiveCoachToggle, useLiveCoachPreference } from "./live-coach";
import { ProcessingView } from "./processing-view";

type Phase = "prepare" | "countdown" | "recording" | "review" | "uploading" | "processing";

export type RunnerSession = {
  id: string;
  topicText: string;
  modeName: string;
  targetDurationSec: number;
  withVideo: boolean;
};

function sendEvent(
  sessionId: string,
  type: "countdown" | "start" | "restart" | "cancel" | "voice-only",
) {
  return apiFetch<{ status: string }>(`/api/sessions/${sessionId}/events`, {
    method: "POST",
    json: { type },
  });
}

function TimerRing({ remainingMs, durationMs }: { remainingMs: number; durationMs: number }) {
  const r = 54;
  const c = 2 * Math.PI * r;
  const fraction = durationMs ? remainingMs / durationMs : 0;
  const warn = remainingMs <= 10_000;
  return (
    <div className="relative size-40 sm:size-48">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={r} className="fill-none stroke-muted" strokeWidth="7" />
        <circle
          cx="60"
          cy="60"
          r={r}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - fraction)}
          className={cn(
            "fill-none transition-[stroke-dashoffset] duration-200 ease-linear",
            warn ? "stroke-destructive" : "stroke-primary",
          )}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "text-4xl font-semibold tabular-nums sm:text-5xl",
            warn && "text-destructive",
          )}
          role="timer"
          aria-label={`${formatClock(remainingMs)} remaining`}
        >
          {formatClock(remainingMs)}
        </span>
        <span className="text-xs text-muted-foreground">remaining</span>
      </div>
    </div>
  );
}

function LevelMeter({ level }: { level: number }) {
  const bars = 12;
  return (
    <div className="flex h-6 items-end gap-0.5" aria-hidden="true">
      {Array.from({ length: bars }, (_, i) => (
        <span
          key={i}
          className={cn(
            "w-1.5 rounded-full transition-[height] duration-75",
            level * bars > i ? "bg-success" : "bg-muted",
          )}
          style={{ height: `${30 + (i / bars) * 70}%` }}
        />
      ))}
    </div>
  );
}

function VideoPreview({
  stream,
  mirrored = true,
}: {
  stream: MediaStream | null;
  mirrored?: boolean;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <video
      ref={ref}
      autoPlay
      muted
      playsInline
      aria-label="Camera preview"
      className={cn(
        "aspect-video w-full rounded-2xl bg-black object-cover",
        mirrored && "-scale-x-100",
      )}
    />
  );
}

export function SessionRunner({
  session,
  directUploadPrefix,
}: {
  session: RunnerSession;
  /** When set, recordings upload straight to storage under this folder. */
  directUploadPrefix?: string;
}) {
  const router = useRouter();
  const [withVideo, setWithVideo] = useState(session.withVideo);
  const recorder = useMediaRecorder(withVideo);
  const [phase, setPhase] = useState<Phase>("prepare");
  const [count, setCount] = useState(3);
  const [result, setResult] = useState<RecordingResult | null>(null);
  const [upload, setUpload] = useState<{ progress: number; error: string | null }>({
    progress: 0,
    error: null,
  });
  const [busy, setBusy] = useState(false);
  const level = useAudioLevel(recorder.stream, phase === "prepare" || phase === "recording");

  const finishRef = useRef<() => void>(() => {});
  const timer = useTimer(session.targetDurationSec * 1000, () => finishRef.current());
  const coachPref = useLiveCoachPreference();
  const coach = useLiveCoach({
    enabled: coachPref.enabled && phase === "recording",
    listening: phase === "recording" && timer.status === "running",
    elapsedMs: timer.elapsedMs,
  });

  const previewUrl = useMemo(() => (result ? URL.createObjectURL(result.media) : null), [result]);
  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    },
    [previewUrl],
  );

  // Warn before leaving while a recording is in progress or unsaved.
  useEffect(() => {
    if (phase !== "recording" && phase !== "review" && phase !== "uploading") return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [phase]);

  const { requestAccess } = recorder;
  useEffect(() => {
    void requestAccess();
  }, [requestAccess]);

  const beginCountdown = async () => {
    setBusy(true);
    try {
      await sendEvent(session.id, "countdown");
      coach.reset();
      setCount(3);
      setPhase("countdown");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't start the countdown.");
    } finally {
      setBusy(false);
    }
  };

  // 3-2-1 countdown, then start recording + timer together.
  useEffect(() => {
    if (phase !== "countdown") return;
    if (count === 0) {
      if (recorder.start()) {
        timer.start();
        setPhase("recording");
        void sendEvent(session.id, "start").catch(() => {});
      } else {
        setPhase("prepare");
      }
      return;
    }
    const id = window.setTimeout(() => setCount((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, count]);

  const finish = useCallback(async () => {
    timer.finish();
    const res = await recorder.stop();
    if (!res || res.media.size === 0) {
      toast.error("Nothing was recorded. Please try again.");
      setPhase("prepare");
      return;
    }
    setResult(res);
    setPhase("review");
  }, [recorder, timer]);
  finishRef.current = () => void finish();

  const togglePause = () => {
    if (timer.status === "running") {
      timer.pause();
      recorder.pause();
    } else if (timer.status === "paused") {
      timer.resume();
      recorder.resume();
    }
  };

  const restart = async () => {
    recorder.discard();
    timer.reset();
    setResult(null);
    try {
      await sendEvent(session.id, "restart");
    } catch {
      /* state is re-synced on the next countdown */
    }
    if (!recorder.stream) await recorder.requestAccess();
    setPhase("prepare");
  };

  const deleteAndExit = async () => {
    recorder.release();
    setResult(null);
    try {
      await sendEvent(session.id, "cancel");
    } catch {
      /* already cancelled or not cancellable: fine */
    }
    toast.success("Recording deleted.");
    router.push("/practice");
  };

  const switchToVoice = async () => {
    setBusy(true);
    try {
      await sendEvent(session.id, "voice-only");
      recorder.release();
      setWithVideo(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't switch to voice only.");
    } finally {
      setBusy(false);
    }
  };
  // Re-request devices after switching capture type.
  useEffect(() => {
    if (!withVideo && session.withVideo) void requestAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [withVideo]);

  const save = async () => {
    if (!result) return;
    const kind = withVideo ? "VIDEO" : "AUDIO";
    if (result.media.size > MAX_RECORDING_BYTES[kind]) {
      setUpload({
        progress: 0,
        error: "This recording is too large to upload. Try a shorter take.",
      });
      return;
    }
    recorder.release();
    setPhase("uploading");
    setUpload({ progress: 0, error: null });
    const durationMs = result.durationMs;
    const elapsedSec = Math.round(timer.elapsedMs / 1000);
    const totalBytes = result.media.size + (result.audio?.size ?? 0);

    const uploadThroughServer = async () => {
      const form = new FormData();
      form.set("kind", kind);
      form.set("durationMs", String(durationMs));
      form.set("elapsedSec", String(elapsedSec));
      form.set("media", result.media, withVideo ? "recording.webm" : "audio.webm");
      if (result.audio) form.set("audio", result.audio, "audio.webm");
      await uploadWithProgress(`/api/sessions/${session.id}/recording`, form, (p) =>
        setUpload({ progress: p, error: null }),
      );
    };

    const uploadDirect = async (prefix: string) => {
      const total = totalBytes || 1;
      const loaded = { media: 0, audio: 0 };
      const report = () =>
        setUpload({ progress: Math.min(1, (loaded.media + loaded.audio) / total), error: null });
      const common = { sessionId: session.id, prefix };
      const [media, audio] = await Promise.all([
        uploadToStorage(result.media, {
          ...common,
          role: "media",
          onProgress: (n) => ((loaded.media = n), report()),
        }),
        result.audio
          ? uploadToStorage(result.audio, {
              ...common,
              role: "audio",
              onProgress: (n) => ((loaded.audio = n), report()),
            })
          : null,
      ]);
      await apiFetch(`/api/sessions/${session.id}/recording`, {
        method: "POST",
        json: { kind, durationMs, elapsedSec, media, audio },
      });
    };

    const uploadInParts = async () => {
      const total = totalBytes || 1;
      const loaded = { media: 0, audio: 0 };
      const report = () =>
        setUpload({ progress: Math.min(1, (loaded.media + loaded.audio) / total), error: null });
      const media = await uploadInChunks(result.media, {
        sessionId: session.id,
        role: "media",
        onProgress: (n) => ((loaded.media = n), report()),
      });
      const audio = result.audio
        ? await uploadInChunks(result.audio, {
            sessionId: session.id,
            role: "audio",
            onProgress: (n) => ((loaded.audio = n), report()),
          })
        : null;
      await apiFetch(`/api/sessions/${session.id}/recording`, {
        method: "POST",
        json: { kind, durationMs, elapsedSec, media, audio },
      });
    };

    try {
      // Small recordings go in one request. Larger ones (server requests are
      // capped at ~4.5 MB) go straight to storage when that's set up, otherwise
      // through the server in parts, which is also the fallback.
      if (totalBytes <= MAX_FUNCTION_UPLOAD_BYTES) {
        await uploadThroughServer();
      } else if (directUploadPrefix) {
        try {
          await uploadDirect(directUploadPrefix);
        } catch (e) {
          if (!(e instanceof ApiError && e.code === "DIRECT_UPLOAD")) throw e;
          setUpload({ progress: 0, error: null });
          await uploadInParts();
        }
      } else {
        await uploadInParts();
      }
      setResult(null);
      setPhase("processing");
    } catch (e) {
      setUpload({ progress: 0, error: e instanceof ApiError ? e.message : "Upload failed." });
    }
  };

  if (phase === "processing") {
    return (
      <ProcessingView sessionId={session.id} initialStatus="PROCESSING" initialFailure={null} />
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (recorder.status === "error" && recorder.error && phase === "prepare") {
    const msg = MEDIA_ERROR_MESSAGES[recorder.error];
    return (
      <div className="mx-auto max-w-lg space-y-4 py-8">
        <ErrorState
          title={msg.title}
          description={msg.description}
          onRetry={() => void recorder.requestAccess()}
        >
          {withVideo &&
          recorder.error !== "unsupported" &&
          recorder.error !== "insecure-context" ? (
            <Button variant="secondary" onClick={switchToVoice} disabled={busy}>
              <Mic /> Continue with voice only
            </Button>
          ) : null}
          <Button variant="ghost" onClick={deleteAndExit}>
            Back to setup
          </Button>
        </ErrorState>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
      {/* Topic: always the most prominent element */}
      <div className="w-full space-y-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <Badge variant="secondary">{session.modeName}</Badge>
          <Badge variant="outline">{formatTimerOption(session.targetDurationSec)}</Badge>
          <Badge variant="outline" className="gap-1">
            {withVideo ? <Camera className="size-3" /> : <Mic className="size-3" />}
            {withVideo ? "Video" : "Voice only"}
          </Badge>
        </div>
        <h1
          className="text-2xl leading-snug font-semibold text-balance sm:text-3xl"
          data-testid="session-topic"
        >
          {session.topicText}
        </h1>
      </div>

      {phase === "prepare" ? (
        <div className="w-full space-y-5">
          {withVideo ? (
            recorder.stream ? (
              <VideoPreview stream={recorder.stream} />
            ) : (
              <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-muted">
                <Spinner className="size-6" label="Starting camera" />
              </div>
            )
          ) : null}
          <div className="flex flex-col items-center gap-4 rounded-2xl border p-6 text-center">
            {recorder.status === "ready" ? (
              <>
                <div className="flex items-center gap-3 text-sm">
                  <Mic className="size-4 text-success" /> Microphone ready
                  <LevelMeter level={level} />
                </div>
                <p className="max-w-md text-sm text-muted-foreground">
                  Take a breath and think of one main point. When you press start you&apos;ll get a
                  3-second countdown.
                </p>
                <Button
                  size="lg"
                  className="h-12 px-8 text-base"
                  onClick={beginCountdown}
                  disabled={busy}
                >
                  {busy ? <Spinner label="Starting" /> : <Play />}
                  Start
                </Button>
                {coachPref.supported ? (
                  <LiveCoachToggle enabled={coachPref.enabled} onChange={coachPref.setEnabled} />
                ) : null}
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status">
                <Spinner /> Waiting for {withVideo ? "camera and microphone" : "microphone"}{" "}
                permission…
              </div>
            )}
          </div>
        </div>
      ) : null}

      {phase === "countdown" ? (
        <div
          className="flex h-64 items-center justify-center"
          role="status"
          aria-live="assertive"
          aria-label={count > 0 ? `Starting in ${count}` : "Go"}
        >
          <AnimatePresence mode="popLayout">
            <motion.span
              key={count}
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.4, opacity: 0 }}
              transition={{ duration: 0.35 }}
              className="text-brand-gradient text-9xl font-bold tabular-nums"
              data-testid="countdown"
            >
              {count > 0 ? count : "Go"}
            </motion.span>
          </AnimatePresence>
        </div>
      ) : null}

      {phase === "recording" ? (
        <div className="flex w-full flex-col items-center gap-6">
          {withVideo ? (
            <div className="relative w-full max-w-xl">
              <VideoPreview stream={recorder.stream} />
            </div>
          ) : null}
          <div className="flex flex-col items-center gap-3">
            <TimerRing remainingMs={timer.remainingMs} durationMs={timer.durationMs} />
            <div className="flex items-center gap-3 text-sm" role="status" aria-live="polite">
              {timer.status === "paused" ? (
                <Badge variant="secondary" className="gap-1.5">
                  <MicOff className="size-3" /> Paused
                </Badge>
              ) : (
                <Badge variant="secondary" className="gap-1.5" data-testid="recording-indicator">
                  <span className="size-2 rounded-full bg-destructive motion-safe:animate-pulse" />{" "}
                  Recording
                </Badge>
              )}
              <span className="text-muted-foreground tabular-nums">
                {formatClock(timer.elapsedMs, false)} elapsed
              </span>
              <LevelMeter level={timer.status === "paused" ? 0 : level} />
            </div>
          </div>
          {coachPref.enabled ? (
            <LiveCoachPanel
              fillerCount={coach.fillerCount}
              topFillers={coach.topFillers}
              lastFiller={coach.lastFiller}
              wpm={coach.wpm}
              pace={coach.pace}
              blocked={coach.blocked}
            />
          ) : null}
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" size="lg" onClick={togglePause}>
              {timer.status === "paused" ? <Play /> : <Pause />}
              {timer.status === "paused" ? "Resume" : "Pause"}
            </Button>
            <Button variant="outline" size="lg" onClick={restart}>
              <RotateCcw /> Restart
            </Button>
            <Button size="lg" onClick={() => void finish()}>
              <Square /> Finish
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "review" && result && previewUrl ? (
        <div className="w-full space-y-5">
          <div
            className="flex items-center justify-center gap-2 text-sm text-success"
            role="status"
          >
            <CheckCircle2 className="size-4" /> Recorded {formatClock(result.durationMs, false)}
          </div>
          {withVideo ? (
            <video
              src={previewUrl}
              controls
              playsInline
              className="aspect-video w-full rounded-2xl bg-black"
              aria-label="Your recording"
            />
          ) : (
            <audio src={previewUrl} controls className="w-full" aria-label="Your recording" />
          )}
          {upload.error ? (
            <p role="alert" className="text-center text-sm text-destructive">
              {upload.error}
            </p>
          ) : null}
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="lg" onClick={restart}>
              <RotateCcw /> Retake
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="lg">
                  <Trash2 /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this recording?</AlertDialogTitle>
                  <AlertDialogDescription>
                    The recording hasn&apos;t been saved and will be discarded. This can&apos;t be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep it</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteAndExit}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button size="lg" onClick={save}>
              <Upload /> Save &amp; get feedback
            </Button>
          </div>
        </div>
      ) : null}

      {phase === "uploading" ? (
        <div className="w-full max-w-md space-y-4 py-8 text-center">
          {upload.error ? (
            <ErrorState
              title="Upload failed"
              description={upload.error}
              onRetry={save}
              retryLabel="Retry upload"
            >
              <Button variant="ghost" onClick={() => setPhase("review")}>
                Back to review
              </Button>
            </ErrorState>
          ) : (
            <div role="status" aria-live="polite" className="space-y-3">
              <p className="font-medium">Uploading your recording…</p>
              <Progress value={Math.round(upload.progress * 100)} aria-label="Upload progress" />
              <p className="text-sm text-muted-foreground">{Math.round(upload.progress * 100)}%</p>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
