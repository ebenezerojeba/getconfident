"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";

import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { isLiveCoachSupported, PACE, type PaceLabel } from "@/features/recording/use-live-coach";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "live-coach-enabled";
const listeners = new Set<() => void>();

/** The live coach on/off choice, remembered on this device. */
export function useLiveCoachPreference() {
  const enabled = useSyncExternalStore(
    (notify) => {
      listeners.add(notify);
      return () => listeners.delete(notify);
    },
    () => window.localStorage.getItem(STORAGE_KEY) === "1",
    () => false,
  );
  const supported = useSyncExternalStore(
    () => () => {},
    isLiveCoachSupported,
    () => false,
  );
  const setEnabled = useCallback((value: boolean) => {
    window.localStorage.setItem(STORAGE_KEY, value ? "1" : "0");
    listeners.forEach((l) => l());
  }, []);
  return { enabled: enabled && supported, supported, setEnabled };
}

export function LiveCoachToggle({
  enabled,
  onChange,
}: {
  enabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex w-full max-w-md items-start gap-3 rounded-xl bg-muted/50 p-3 text-left">
      <Switch
        id="live-coach"
        checked={enabled}
        onCheckedChange={onChange}
        aria-describedby="live-coach-help"
        className="mt-0.5"
      />
      <div className="space-y-1">
        <Label htmlFor="live-coach" className="flex items-center gap-2">
          <Sparkles className="size-4 text-primary" aria-hidden="true" /> Live coach
          <Badge variant="secondary" className="text-[10px]">
            New
          </Badge>
        </Label>
        <p id="live-coach-help" className="text-xs text-muted-foreground">
          See your filler words and pace while you speak. Uses your browser&apos;s speech
          recognition, which in Chrome is processed by Google.
        </p>
      </div>
    </div>
  );
}

const PACE_TEXT: Record<PaceLabel, { label: string; tone: string }> = {
  "warming-up": { label: "Listening…", tone: "text-muted-foreground" },
  slow: { label: "A little slow. Add some energy", tone: "text-foreground" },
  good: { label: "Great pace", tone: "text-success" },
  fast: { label: "Slow down a touch", tone: "text-destructive" },
};

/** Shown during recording: live filler count, pace and a nudge on each filler. */
export function LiveCoachPanel({
  fillerCount,
  topFillers,
  lastFiller,
  wpm,
  pace,
  blocked,
}: {
  fillerCount: number;
  topFillers: { filler: string; count: number }[];
  lastFiller: string | null;
  wpm: number | null;
  pace: PaceLabel;
  blocked: boolean;
}) {
  if (blocked) {
    return (
      <p className="text-xs text-muted-foreground" role="status">
        Live coach is unavailable in this browser. Your full feedback will still be ready after you
        finish.
      </p>
    );
  }
  const paceText = PACE_TEXT[pace];
  return (
    <div
      className="grid w-full max-w-md grid-cols-2 gap-3 rounded-2xl border p-4"
      data-testid="live-coach"
      aria-label="Live coach"
    >
      <div className="relative space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Filler words</p>
        <p
          className={cn(
            "text-2xl font-semibold tabular-nums",
            fillerCount === 0 ? "text-success" : fillerCount > 5 ? "text-destructive" : "",
          )}
        >
          {fillerCount}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {topFillers.length
            ? topFillers.map((f) => `${f.filler} ×${f.count}`).join(" · ")
            : "None so far. Nice!"}
        </p>
        {lastFiller ? (
          <motion.span
            key={fillerCount}
            initial={{ opacity: 1, y: 0 }}
            animate={{ opacity: 0, y: -12 }}
            transition={{ duration: 1.6, ease: "easeOut" }}
            className="pointer-events-none absolute top-0 right-0 rounded-full bg-warning/20 px-2 py-0.5 text-xs font-medium"
            aria-hidden="true"
          >
            “{lastFiller}”
          </motion.span>
        ) : null}
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground">Pace</p>
        <p className="text-2xl font-semibold tabular-nums">
          {wpm ?? "–"}
          <span className="ml-1 text-xs font-normal text-muted-foreground">wpm</span>
        </p>
        <p className={cn("text-xs font-medium", paceText.tone)}>{paceText.label}</p>
        <p className="sr-only">
          Aim for {PACE.slow} to {PACE.fast} words per minute.
        </p>
      </div>
    </div>
  );
}
