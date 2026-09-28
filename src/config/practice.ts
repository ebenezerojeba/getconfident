import type { Difficulty, TopicCategory } from "@/generated/prisma/enums";

export const TIMER_OPTIONS_SEC = [30, 60, 120, 180, 300, 600] as const;
export type TimerOptionSec = (typeof TIMER_OPTIONS_SEC)[number];
export const DEFAULT_TIMER_SEC: TimerOptionSec = 120;

export function formatTimerOption(sec: number): string {
  return sec < 60 ? `${sec} sec` : `${sec / 60} min`;
}

export const TOPIC_CATEGORIES: { id: TopicCategory; label: string; emoji: string }[] = [
  { id: "EVERYDAY_LIFE", label: "Everyday Life", emoji: "☕" },
  { id: "BUSINESS", label: "Business", emoji: "💼" },
  { id: "TECHNOLOGY", label: "Technology", emoji: "💡" },
  { id: "LEADERSHIP", label: "Leadership", emoji: "🧭" },
  { id: "SCHOOL", label: "School", emoji: "🎓" },
  { id: "DEBATE", label: "Debate", emoji: "⚖️" },
  { id: "CREATIVITY", label: "Creativity", emoji: "🎨" },
  { id: "PERSONAL_GROWTH", label: "Personal Growth", emoji: "🌱" },
  { id: "FUNNY", label: "Funny Topics", emoji: "😄" },
  { id: "PRESENTATION", label: "Presentation Topics", emoji: "📊" },
  { id: "JOB_INTERVIEW", label: "Job Interview Questions", emoji: "🤝" },
  { id: "BEHAVIORAL", label: "Behavioral Questions", emoji: "🧩" },
  { id: "ICE_BREAKER", label: "Ice Breakers", emoji: "🧊" },
  { id: "STORYTELLING", label: "Storytelling", emoji: "📖" },
  { id: "PUBLIC_SPEAKING", label: "Public Speaking", emoji: "🎤" },
];

export const CATEGORY_LABEL = Object.fromEntries(
  TOPIC_CATEGORIES.map((c) => [c.id, c.label]),
) as Record<TopicCategory, string>;

export const DIFFICULTIES: { id: Difficulty; label: string; description: string }[] = [
  { id: "EASY", label: "Easy", description: "Familiar, personal topics" },
  { id: "MEDIUM", label: "Medium", description: "Opinions and short arguments" },
  { id: "HARD", label: "Hard", description: "Abstract or high-pressure prompts" },
];

export const SPEAKING_GOALS = [
  { id: "interviews", label: "Ace job interviews" },
  { id: "presentations", label: "Present with confidence" },
  { id: "everyday", label: "Speak clearly day to day" },
  { id: "leadership", label: "Lead meetings and teams" },
  { id: "fillers", label: "Cut filler words" },
] as const;
