import {
  ArrowRight,
  AudioLines,
  Brain,
  CheckCircle2,
  Gauge,
  LineChart,
  ListChecks,
  MessageSquareQuote,
  Shuffle,
  Timer,
  TrendingUp,
  Trophy,
} from "lucide-react";
import Link from "next/link";

import { NamedIcon } from "@/components/shared/icon";
import { FadeIn } from "@/components/shared/motion";
import { Button } from "@/components/ui/button";
import { PRACTICE_MODES } from "@/config/practice-modes";

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 text-center">
      <p className="text-sm font-semibold tracking-wide text-primary uppercase">{eyebrow}</p>
      <h2 className="text-title font-semibold">{title}</h2>
      <p className="text-lg text-muted-foreground">{description}</p>
    </div>
  );
}

const VALUE = [
  {
    icon: Shuffle,
    title: "Train thinking speed",
    body: "Random prompts across 15 categories build the reflex to structure an answer on the spot.",
  },
  {
    icon: Brain,
    title: "Coaching, not just scores",
    body: "Specific feedback on what worked, what to fix and better ways to phrase it.",
  },
  {
    icon: AudioLines,
    title: "Measured, not guessed",
    body: "Pace, pauses and filler words are measured from your transcript, not estimated.",
  },
  {
    icon: TrendingUp,
    title: "Progress you can see",
    body: "Streaks, trends and achievements keep you practicing a few minutes every day.",
  },
];

export function ValueProposition() {
  return (
    <section className="container-page py-20 sm:py-28">
      <SectionHeading
        eyebrow="Why it works"
        title="Deliberate practice for the way people really speak"
        description="Interviews, meetings and presentations rarely come with a script. Practice the skill that matters: speaking clearly without one."
      />
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {VALUE.map(({ icon: Icon, title, body }, i) => (
          <FadeIn key={title} delay={i * 0.05} className="rounded-2xl border bg-card p-6">
            <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Icon className="size-5" aria-hidden="true" />
            </div>
            <h3 className="mt-4 font-semibold">{title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{body}</p>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

const STEPS = [
  { icon: ListChecks, title: "Choose a mode", body: "Interview, debate, storytelling and more." },
  {
    icon: Shuffle,
    title: "Get a topic",
    body: "Pick a category and difficulty, or go fully random.",
  },
  { icon: Timer, title: "Speak", body: "3-2-1, then talk for 30 seconds up to 10 minutes." },
  {
    icon: MessageSquareQuote,
    title: "Get coached",
    body: "A detailed AI report in under a minute.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 border-y bg-muted/40 py-20 sm:py-28">
      <div className="container-page">
        <SectionHeading
          eyebrow="How it works"
          title="From prompt to feedback in four steps"
          description="Every session follows the same focused loop, so practice becomes a habit."
        />
        <ol className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li
              key={title}
              className="reveal relative h-full rounded-2xl border bg-card p-6"
              style={{ ["--reveal-delay" as string]: `${i * 6}%` }}
            >
              <span
                aria-hidden="true"
                className="text-5xl font-light text-muted-foreground tabular-nums"
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <Icon className="mt-3 size-6 text-primary" aria-hidden="true" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function PracticeModes() {
  return (
    <section id="modes" className="container-page scroll-mt-20 py-20 sm:py-28">
      <SectionHeading
        eyebrow="Practice modes"
        title="Rehearse the moments that matter"
        description="Each mode has its own prompts and evaluation criteria, so feedback fits the situation."
      />
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {PRACTICE_MODES.map((m, i) => (
          <FadeIn
            key={m.id}
            delay={(i % 3) * 0.05}
            className="group rounded-2xl border bg-card p-6 transition-colors hover:border-primary/40"
          >
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                <NamedIcon name={m.icon} className="size-5" />
              </div>
              <div>
                <h3 className="font-semibold">{m.name}</h3>
                <p className="text-xs text-muted-foreground">{m.tagline}</p>
              </div>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">{m.description}</p>
          </FadeIn>
        ))}
      </div>
    </section>
  );
}

const FEEDBACK_POINTS = [
  "16 speaking dimensions scored with evidence, from clarity to energy",
  "Better wording: your own sentences, rewritten",
  "Grammar corrections that explain the rule",
  "Toastmasters-style evaluation of structure and delivery",
  "Homework and a recommended next challenge",
];

export function FeedbackSection() {
  return (
    <section id="feedback" className="scroll-mt-20 border-y bg-muted/40 py-20 sm:py-28">
      <div className="container-page grid items-center gap-12 lg:grid-cols-2">
        <FadeIn className="space-y-6">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">AI feedback</p>
          <h2 className="text-title font-semibold">Honest, specific feedback. No vague praise.</h2>
          <p className="text-lg text-muted-foreground">
            Your coach separates what it measured from what it inferred, and it never invents
            metrics it can&apos;t observe.
          </p>
          <ul className="space-y-3">
            {FEEDBACK_POINTS.map((p) => (
              <li key={p} className="flex gap-3">
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden="true" />
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </FadeIn>
        <FadeIn delay={0.1}>
          <div
            className="rounded-3xl border bg-card p-6 shadow-xl shadow-primary/5"
            aria-hidden="true"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall score</p>
                <p className="text-5xl font-semibold tabular-nums">82</p>
              </div>
              <Gauge className="size-10 text-primary" />
            </div>
            <div className="mt-6 grid grid-cols-3 gap-3 text-center">
              {[
                ["142", "words/min"],
                ["2.1", "fillers/min"],
                ["1", "long pause"],
              ].map(([v, l]) => (
                <div key={l} className="rounded-xl bg-muted p-3">
                  <p className="text-xl font-semibold tabular-nums">{v}</p>
                  <p className="text-xs text-muted-foreground">{l}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 space-y-3 text-sm">
              <div className="rounded-xl border p-3">
                <p className="text-xs font-medium text-muted-foreground">Better wording</p>
                <p className="mt-1 text-muted-foreground line-through decoration-destructive/60">
                  So basically I kind of led the project.
                </p>
                <p className="mt-1 font-medium">I led the project from kickoff to launch.</p>
              </div>
              <div className="rounded-xl border p-3">
                <p className="text-xs font-medium text-muted-foreground">Homework</p>
                <p className="mt-1">Answer 3 prompts using Point → Reason → Example.</p>
              </div>
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}

const TREND = [58, 61, 60, 66, 64, 70, 73, 72, 77, 81];

export function ProgressSection() {
  const max = 100;
  const w = 320;
  const h = 120;
  const pts = TREND.map((v, i) => `${(i / (TREND.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <section id="progress" className="container-page scroll-mt-20 py-20 sm:py-28">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <FadeIn delay={0.1} className="order-2 lg:order-1">
          <div className="rounded-3xl border bg-card p-6" aria-hidden="true">
            <div className="flex items-center justify-between">
              <p className="font-semibold">Average score</p>
              <span className="text-sm text-success">+23 in 10 sessions</span>
            </div>
            <svg viewBox={`0 0 ${w} ${h}`} className="mt-6 h-36 w-full overflow-visible">
              <polyline
                points={pts}
                fill="none"
                className="stroke-primary"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
            <div className="mt-6 grid grid-cols-3 gap-3">
              {[
                [Trophy, "7-day streak"],
                [LineChart, "−48% fillers"],
                [Timer, "42 min spoken"],
              ].map(([Icon, label]) => {
                const I = Icon as typeof Trophy;
                return (
                  <div
                    key={label as string}
                    className="rounded-xl bg-muted p-3 text-center text-xs"
                  >
                    <I className="mx-auto mb-1 size-4 text-primary" />
                    {label as string}
                  </div>
                );
              })}
            </div>
          </div>
        </FadeIn>
        <FadeIn className="order-1 space-y-6 lg:order-2">
          <p className="text-sm font-semibold tracking-wide text-primary uppercase">Progress</p>
          <h2 className="text-title font-semibold">Watch your confidence compound</h2>
          <p className="text-lg text-muted-foreground">
            Every session updates your trends for score, confidence, grammar, pace and filler words.
            Streaks and achievements make a few minutes a day stick.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="container-page pb-24">
      <FadeIn className="relative overflow-hidden rounded-3xl bg-brand-gradient px-6 py-16 text-center text-white sm:px-12">
        <h2 className="text-title font-semibold text-white">Your next great answer starts now</h2>
        <p className="mx-auto mt-4 max-w-xl text-lg text-white/85">
          Create a free account and finish your first practice session in under three minutes.
        </p>
        <Button asChild size="lg" variant="secondary" className="mt-8 h-12 px-6 text-base">
          <Link href="/sign-up">
            Start practicing <ArrowRight />
          </Link>
        </Button>
      </FadeIn>
    </section>
  );
}
