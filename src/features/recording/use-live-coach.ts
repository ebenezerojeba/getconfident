"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { analyzeFillers, type Filler } from "@/features/filler-analysis/analyze";

/** Minimal Web Speech API types (not in every TypeScript DOM lib). */
type RecognitionResult = { isFinal: boolean; 0: { transcript: string } };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type Recognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};
type RecognitionCtor = new () => Recognition;

function getRecognition(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export const isLiveCoachSupported = () => getRecognition() !== null;

/** Comfortable conversational pace, in words per minute. */
export const PACE = { slow: 110, fast: 170 } as const;

export type PaceLabel = "warming-up" | "slow" | "good" | "fast";

export function paceLabel(wpm: number | null): PaceLabel {
  if (wpm === null) return "warming-up";
  if (wpm < PACE.slow) return "slow";
  if (wpm > PACE.fast) return "fast";
  return "good";
}

/**
 * Live coaching while recording: transcribes speech in the browser as you talk
 * and reports filler words and pace. Uses the same filler detection as the
 * final report. Recognition restarts itself after silences (browsers stop it).
 */
export function useLiveCoach({
  enabled,
  listening,
  elapsedMs,
}: {
  enabled: boolean;
  /** True while actually recording (false when paused). */
  listening: boolean;
  elapsedMs: number;
}) {
  const [transcript, setTranscript] = useState("");
  const [blocked, setBlocked] = useState(false);
  const finalRef = useRef("");

  useEffect(() => {
    if (!enabled || !listening || blocked) return;
    const Ctor = getRecognition();
    if (!Ctor) return;
    let stopped = false;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = navigator.language || "en-US";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalRef.current += `${r[0].transcript} `;
        else interim += r[0].transcript;
      }
      setTranscript(finalRef.current + interim);
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        stopped = true;
        setBlocked(true);
      }
    };
    rec.onend = () => {
      if (stopped) return;
      try {
        rec.start();
      } catch {
        // Already restarting.
      }
    };
    try {
      rec.start();
    } catch {
      return;
    }
    return () => {
      stopped = true;
      rec.onend = null;
      rec.onresult = null;
      try {
        rec.stop();
      } catch {
        // Already stopped.
      }
    };
  }, [enabled, listening, blocked]);

  const reset = useCallback(() => {
    finalRef.current = "";
    setTranscript("");
  }, []);

  const stats = useMemo(() => {
    const fillers = analyzeFillers(transcript);
    const minutes = elapsedMs / 60_000;
    // Pace is noisy in the first seconds; wait for a few words first.
    const wpm =
      elapsedMs >= 10_000 && fillers.totalWords >= 8
        ? Math.round(fillers.totalWords / minutes)
        : null;
    const last = fillers.occurrences.at(-1)?.filler ?? null;
    return {
      words: fillers.totalWords,
      fillerCount: fillers.totalFillers,
      topFillers: fillers.byFiller.slice(0, 3) as { filler: Filler; count: number }[],
      lastFiller: last,
      wpm,
      pace: paceLabel(wpm),
    };
  }, [transcript, elapsedMs]);

  return { ...stats, blocked, reset };
}
