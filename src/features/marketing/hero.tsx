import { ArrowRight, Mic, Sparkles } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const BARS = [8, 14, 22, 12, 28, 18, 34, 20, 26, 12, 30, 16, 24, 10, 20, 14, 28, 18, 12, 22];

function ProductPreview() {
  const progress = 0.62;
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-brand-gradient opacity-20 blur-2xl" />
      <div className="rounded-3xl border bg-card p-6 shadow-2xl shadow-primary/10">
        <div className="flex items-center justify-between">
          <Badge variant="secondary" className="gap-1.5">
            <span className="size-1.5 rounded-full bg-destructive motion-safe:animate-pulse" />
            Recording
          </Badge>
          <span className="text-xs text-muted-foreground">Interview · Medium</span>
        </div>
        <p className="mt-5 text-lg leading-snug font-semibold text-balance">
          “Tell me about a time you had to persuade someone.”
        </p>
        <div className="mt-6 flex items-center gap-6">
          <svg viewBox="0 0 120 120" className="size-28 shrink-0 -rotate-90">
            <circle cx="60" cy="60" r={r} className="fill-none stroke-muted" strokeWidth="8" />
            <circle
              cx="60"
              cy="60"
              r={r}
              className="fill-none stroke-primary"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c * (1 - progress)}
            />
            <text
              x="60"
              y="60"
              className="rotate-90 fill-foreground text-[22px] font-semibold tabular-nums"
              textAnchor="middle"
              dominantBaseline="central"
              transform="rotate(90 60 60)"
            >
              0:46
            </text>
          </svg>
          <div className="flex h-16 flex-1 items-center gap-1">
            {BARS.map((h, i) => (
              <span
                key={i}
                className="w-full rounded-full bg-primary/70 motion-safe:animate-[pulse_1.6s_ease-in-out_infinite]"
                style={{ height: `${h * 1.6}px`, animationDelay: `${(i % 7) * 120}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
      <div className="absolute -right-3 -bottom-8 w-56 rounded-2xl border bg-card p-4 shadow-xl sm:-right-10">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <Sparkles className="size-3.5 text-primary" /> AI feedback
        </div>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-3xl font-semibold tabular-nums">86</span>
          <span className="pb-1 text-xs text-success">+7 this week</span>
        </div>
        <div className="mt-3 space-y-1.5 text-xs">
          {[
            ["Clarity", 88],
            ["Confidence", 81],
            ["Filler words", 92],
          ].map(([label, v]) => (
            <div key={label} className="flex items-center gap-2">
              <span className="w-20 text-muted-foreground">{label}</span>
              <span className="h-1.5 flex-1 rounded-full bg-muted">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${v}%` }} />
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-hero-glow">
      <div className="container-page grid items-center gap-16 pt-16 pb-24 sm:pt-24 lg:grid-cols-[1.1fr_1fr] lg:pb-32">
        <div className="animate-in space-y-7 duration-700 fade-in slide-in-from-bottom-3 motion-reduce:animate-none">
          <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1 text-xs">
            <Mic className="size-3.5 text-primary" /> AI speaking coach for real-world moments
          </Badge>
          <h1 className="text-display font-semibold">
            Think fast. <span className="text-brand-gradient">Speak with confidence.</span>
          </h1>
          <p className="max-w-xl text-lg text-muted-foreground">
            Get a random topic, speak for as long as you choose, and receive instant, specific
            coaching on clarity, structure, confidence and filler words, so every practice session
            makes you measurably better.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" className="h-12 px-6 text-base">
              <Link href="/sign-up">
                Start practicing free <ArrowRight />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-12 px-6 text-base">
              <Link href="#how-it-works">See how it works</Link>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            No credit card. Works in your browser with a camera or voice only.
          </p>
        </div>
        <div className="animate-in delay-150 duration-700 fill-mode-both fade-in slide-in-from-bottom-3 motion-reduce:animate-none">
          <ProductPreview />
        </div>
      </div>
    </section>
  );
}
