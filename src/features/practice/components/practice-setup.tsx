"use client";

import { Camera, Mic, RefreshCw, Shuffle, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { NamedIcon } from "@/components/shared/icon";
import { Spinner } from "@/components/shared/states";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  CATEGORY_LABEL,
  DIFFICULTIES,
  formatTimerOption,
  TIMER_OPTIONS_SEC,
  TOPIC_CATEGORIES,
} from "@/config/practice";
import { getMode, PRACTICE_MODES } from "@/config/practice-modes";
import type { Difficulty, PracticeMode, TopicCategory } from "@/generated/prisma/enums";
import { ApiError, apiFetch } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { type SetupTopic, usePracticeSetup } from "@/stores/practice-setup";

const chip =
  "rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-muted aria-checked:border-primary aria-checked:bg-accent aria-checked:text-accent-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

function RadioChips<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  const move = (dir: 1 | -1) => {
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + dir + options.length) % options.length];
    onChange(next.value);
    requestAnimationFrame(() => document.getElementById(`${label}-${String(next.value)}`)?.focus());
  };
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex flex-wrap gap-2", className)}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === "ArrowDown") {
          e.preventDefault();
          move(1);
        } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
          e.preventDefault();
          move(-1);
        }
      }}
    >
      {options.map((o) => (
        <button
          key={String(o.value)}
          id={`${label}-${String(o.value)}`}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          onClick={() => onChange(o.value)}
          className={chip}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function PracticeSetup({
  defaults,
  dailyChallenge,
  initialMode = null,
}: {
  defaults: { mode: PracticeMode; difficulty: Difficulty; durationSec: number };
  dailyChallenge: SetupTopic | null;
  initialMode?: PracticeMode | null;
}) {
  const router = useRouter();
  const s = usePracticeSetup();
  const [hydrated, setHydrated] = useState(false);
  const [loadingTopic, setLoadingTopic] = useState(false);
  const [starting, startTransition] = useTransition();

  useEffect(() => {
    s.initFrom(defaults);
    if (initialMode) selectMode(initialMode);
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mode = getMode(s.mode);

  async function fetchTopic(skip = false) {
    setLoadingTopic(true);
    try {
      const { topic } = await apiFetch<{ topic: SetupTopic }>("/api/topics/random", {
        method: "POST",
        json: {
          mode: s.mode === "DAILY_CHALLENGE" ? null : s.mode,
          category: s.category,
          difficulty: s.difficulty,
          skipTopicId: skip ? s.topic?.id : null,
        },
      });
      s.set({ topic });
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't load a topic.");
    } finally {
      setLoadingTopic(false);
    }
  }

  function selectMode(id: PracticeMode) {
    const m = getMode(id);
    const patch: Partial<typeof s> = { mode: id, topic: null };
    if (id === "DAILY_CHALLENGE" && dailyChallenge) {
      patch.topic = dailyChallenge;
      patch.difficulty = dailyChallenge.difficulty;
      patch.category = null;
    }
    if (m.promptCategories.length && s.category && !m.promptCategories.includes(s.category)) {
      patch.category = null;
    }
    s.set(patch);
  }

  function start() {
    if (!s.topic) return;
    startTransition(async () => {
      try {
        const { session } = await apiFetch<{ session: { id: string } }>("/api/sessions", {
          method: "POST",
          json: {
            topicId: s.topic!.id,
            mode: s.mode,
            difficulty: s.topic!.difficulty,
            targetDurationSec: s.durationSec,
            withVideo: s.withVideo,
          },
        });
        router.push(`/practice/${session.id}`);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Couldn't start the session.");
      }
    });
  }

  const categoryOptions = mode.promptCategories.length
    ? TOPIC_CATEGORIES.filter((c) => mode.promptCategories.includes(c.id))
    : TOPIC_CATEGORIES;
  const isDaily = s.mode === "DAILY_CHALLENGE";

  if (!hydrated) {
    return (
      <div className="flex justify-center py-24">
        <Spinner className="size-6 text-primary" label="Loading practice setup" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
      <div className="space-y-8">
        <section aria-labelledby="mode-heading" className="space-y-3">
          <h2 id="mode-heading" className="text-sm font-semibold">
            1. Choose a mode
          </h2>
          <div
            role="radiogroup"
            aria-labelledby="mode-heading"
            className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3"
          >
            {PRACTICE_MODES.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={s.mode === m.id}
                onClick={() => selectMode(m.id)}
                className={cn(
                  "flex items-start gap-3 rounded-2xl border p-3 text-left transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                  s.mode === m.id && "border-primary bg-accent/60",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <NamedIcon name={m.icon} className="size-4.5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{m.name}</span>
                  <span className="block text-xs text-muted-foreground">{m.tagline}</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        {!isDaily ? (
          <section aria-labelledby="topic-options" className="space-y-4">
            <h2 id="topic-options" className="text-sm font-semibold">
              2. Topic options
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <p id="difficulty-label" className="text-sm text-muted-foreground">
                  Difficulty
                </p>
                <RadioChips
                  label="Difficulty"
                  value={s.difficulty}
                  options={DIFFICULTIES.filter((d) => mode.difficultyOptions.includes(d.id)).map(
                    (d) => ({
                      value: d.id,
                      label: d.label,
                    }),
                  )}
                  onChange={(difficulty) => s.set({ difficulty, topic: null })}
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="category" className="text-sm text-muted-foreground">
                  Category
                </label>
                <Select
                  value={s.category ?? "ANY"}
                  onValueChange={(v) =>
                    s.set({ category: v === "ANY" ? null : (v as TopicCategory), topic: null })
                  }
                >
                  <SelectTrigger id="category" className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANY">
                      {mode.promptCategories.length
                        ? `Any ${mode.name.toLowerCase()} topic`
                        : "Any category"}
                    </SelectItem>
                    {categoryOptions.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.emoji} {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>
        ) : null}

        <section aria-labelledby="session-options" className="space-y-4">
          <h2 id="session-options" className="text-sm font-semibold">
            {isDaily ? "2." : "3."} Session
          </h2>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Speaking time</p>
            <RadioChips
              label="Speaking time"
              value={s.durationSec}
              options={TIMER_OPTIONS_SEC.map((sec) => ({
                value: sec,
                label: formatTimerOption(sec),
              }))}
              onChange={(durationSec) => s.set({ durationSec })}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-2xl border p-4">
            <div className="flex items-center gap-3">
              {s.withVideo ? (
                <Camera className="size-5 text-primary" />
              ) : (
                <Mic className="size-5 text-primary" />
              )}
              <div>
                <label htmlFor="camera-toggle" className="text-sm font-medium">
                  Camera
                </label>
                <p className="text-xs text-muted-foreground">
                  {s.withVideo
                    ? "Video + audio. Review how you look and sound."
                    : "Voice only. Great for quick practice."}
                </p>
              </div>
            </div>
            <Switch
              id="camera-toggle"
              checked={s.withVideo}
              onCheckedChange={(withVideo) => s.set({ withVideo })}
            />
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <Card className="overflow-hidden">
          <div className="h-1.5 bg-brand-gradient" />
          <CardContent className="space-y-5 pt-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Your topic</p>
              <Badge variant="secondary">
                {mode.name} · {formatTimerOption(s.durationSec)}
              </Badge>
            </div>
            <div aria-live="polite" className="min-h-28">
              {s.topic ? (
                <div className="space-y-3">
                  <p
                    className="text-xl leading-snug font-semibold text-balance"
                    data-testid="topic-text"
                  >
                    {s.topic.text}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline">{CATEGORY_LABEL[s.topic.category]}</Badge>
                    <Badge variant="outline">
                      {DIFFICULTIES.find((d) => d.id === s.topic!.difficulty)?.label}
                    </Badge>
                    {isDaily ? <Badge>Today&apos;s challenge</Badge> : null}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-2 py-6 text-center text-sm text-muted-foreground">
                  <Sparkles className="size-5 text-primary" />
                  {isDaily && !dailyChallenge
                    ? "No daily challenge is available right now."
                    : "Pick a random topic to get started."}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              {!isDaily ? (
                s.topic ? (
                  <Button
                    variant="outline"
                    onClick={() => fetchTopic(true)}
                    disabled={loadingTopic}
                  >
                    {loadingTopic ? <Spinner label="Loading topic" /> : <RefreshCw />}
                    Generate another topic
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => fetchTopic(false)}
                    disabled={loadingTopic}
                  >
                    {loadingTopic ? <Spinner label="Loading topic" /> : <Shuffle />}
                    Pick a random topic
                  </Button>
                )
              ) : null}
              <Button size="lg" className="h-11" onClick={start} disabled={!s.topic || starting}>
                {starting ? <Spinner label="Starting" /> : null}
                Start speaking
              </Button>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
