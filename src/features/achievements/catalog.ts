export type AchievementCode =
  | "FIRST_PRACTICE"
  | "SEVEN_DAY_STREAK"
  | "THIRTY_DAY_STREAK"
  | "HUNDRED_SPEECHES"
  | "NO_FILLER_WORDS"
  | "PERFECT_SCORE"
  | "CONFIDENT_SPEAKER"
  | "INTERVIEW_MASTER"
  | "PRESENTATION_EXPERT";

export type AchievementDefinition = {
  id: AchievementCode;
  name: string;
  description: string;
  /** lucide-react icon name */
  icon: string;
  sortOrder: number;
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: "FIRST_PRACTICE",
    name: "First Practice",
    description: "Complete your first practice session.",
    icon: "Sparkles",
    sortOrder: 1,
  },
  {
    id: "SEVEN_DAY_STREAK",
    name: "7-Day Streak",
    description: "Practice on 7 consecutive days.",
    icon: "Flame",
    sortOrder: 2,
  },
  {
    id: "THIRTY_DAY_STREAK",
    name: "30-Day Streak",
    description: "Practice on 30 consecutive days.",
    icon: "CalendarCheck",
    sortOrder: 3,
  },
  {
    id: "HUNDRED_SPEECHES",
    name: "100 Speeches",
    description: "Complete 100 practice sessions.",
    icon: "Medal",
    sortOrder: 4,
  },
  {
    id: "NO_FILLER_WORDS",
    name: "No Filler Words",
    description: "Finish a session of at least 30 seconds with zero filler words.",
    icon: "Ban",
    sortOrder: 5,
  },
  {
    id: "PERFECT_SCORE",
    name: "Perfect Score",
    description: "Earn an overall score of 100.",
    icon: "Star",
    sortOrder: 6,
  },
  {
    id: "CONFIDENT_SPEAKER",
    name: "Confident Speaker",
    description: "Score 85+ on confidence in 5 sessions.",
    icon: "ShieldCheck",
    sortOrder: 7,
  },
  {
    id: "INTERVIEW_MASTER",
    name: "Interview Master",
    description: "Score 80+ in 10 interview-mode sessions.",
    icon: "Briefcase",
    sortOrder: 8,
  },
  {
    id: "PRESENTATION_EXPERT",
    name: "Presentation Expert",
    description: "Score 80+ in 10 presentation-mode sessions.",
    icon: "Presentation",
    sortOrder: 9,
  },
];
