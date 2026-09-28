import type { Difficulty, PracticeMode, TopicCategory } from "@/generated/prisma/enums";

export type PracticeModeConfig = {
  id: PracticeMode;
  name: string;
  tagline: string;
  description: string;
  /** Categories to draw topics from; empty = any category. */
  promptCategories: TopicCategory[];
  difficultyOptions: Difficulty[];
  defaultDurationSec: number;
  /** Mode-specific evaluation criteria sent to the AI coach. */
  evaluationCriteria: { name: string; description: string }[];
  followUpStyle: string;
  /** lucide-react icon name */
  icon: string;
};

const ALL: Difficulty[] = ["EASY", "MEDIUM", "HARD"];

export const PRACTICE_MODES: PracticeModeConfig[] = [
  {
    id: "IMPROMPTU",
    name: "Impromptu",
    tagline: "Think on your feet",
    description: "A random topic, a short timer and no preparation. The classic training loop.",
    promptCategories: [],
    difficultyOptions: ALL,
    defaultDurationSec: 120,
    evaluationCriteria: [
      {
        name: "Quick structure",
        description: "Forms a clear point-reason-example structure without preparation.",
      },
      { name: "Staying on topic", description: "Answers the prompt directly and avoids rambling." },
    ],
    followUpStyle: "curious audience member probing the main claim",
    icon: "Zap",
  },
  {
    id: "INTERVIEW",
    name: "Interview",
    tagline: "Answer like a top candidate",
    description: "Classic and behavioral interview questions, evaluated for structure and impact.",
    promptCategories: ["JOB_INTERVIEW", "BEHAVIORAL"],
    difficultyOptions: ALL,
    defaultDurationSec: 120,
    evaluationCriteria: [
      {
        name: "STAR structure",
        description: "Situation, Task, Action, Result are clear for behavioral questions.",
      },
      { name: "Relevance", description: "Connects the answer to the role and its requirements." },
      {
        name: "Specificity",
        description: "Uses concrete examples, numbers and outcomes instead of generalities.",
      },
    ],
    followUpStyle: "hiring manager asking probing follow-ups about specifics and results",
    icon: "Briefcase",
  },
  {
    id: "PRESENTATION",
    name: "Presentation",
    tagline: "Own the room",
    description: "Present an idea clearly with an opening, key points and a memorable close.",
    promptCategories: ["PRESENTATION", "BUSINESS", "TECHNOLOGY"],
    difficultyOptions: ALL,
    defaultDurationSec: 180,
    evaluationCriteria: [
      {
        name: "Signposting",
        description: "Previews and signals key points so the audience can follow.",
      },
      { name: "Audience focus", description: "Frames content around what the audience needs." },
      { name: "Memorable close", description: "Ends with a clear takeaway or call to action." },
    ],
    followUpStyle: "audience member in Q&A asking for clarification or evidence",
    icon: "Presentation",
  },
  {
    id: "STORYTELLING",
    name: "Storytelling",
    tagline: "Make it memorable",
    description: "Tell a story with a hook, tension and a satisfying ending.",
    promptCategories: ["STORYTELLING", "PERSONAL_GROWTH", "CREATIVITY"],
    difficultyOptions: ALL,
    defaultDurationSec: 180,
    evaluationCriteria: [
      { name: "Narrative arc", description: "Has a setup, rising tension and resolution." },
      {
        name: "Vivid detail",
        description: "Uses sensory, specific details that make scenes concrete.",
      },
      { name: "Point of the story", description: "The story lands a clear insight or emotion." },
    ],
    followUpStyle: "engaged listener asking what happened next or what it meant",
    icon: "BookOpen",
  },
  {
    id: "DEBATE",
    name: "Debate",
    tagline: "Argue with conviction",
    description: "Take a side, build arguments and anticipate the rebuttal.",
    promptCategories: ["DEBATE"],
    difficultyOptions: ALL,
    defaultDurationSec: 120,
    evaluationCriteria: [
      { name: "Clear position", description: "States a clear stance early." },
      { name: "Reasoning & evidence", description: "Supports claims with logic and examples." },
      { name: "Rebuttal awareness", description: "Anticipates and addresses the opposing view." },
    ],
    followUpStyle: "opponent presenting a counter-argument to rebut",
    icon: "Scale",
  },
  {
    id: "ELEVATOR_PITCH",
    name: "Elevator Pitch",
    tagline: "30 seconds to impress",
    description: "Introduce yourself or an idea concisely and memorably.",
    promptCategories: ["BUSINESS", "ICE_BREAKER"],
    difficultyOptions: ALL,
    defaultDurationSec: 60,
    evaluationCriteria: [
      { name: "Concision", description: "Delivers the essentials without filler content." },
      { name: "Hook", description: "Opens with something that earns attention." },
      { name: "Clear ask", description: "Ends with a specific next step." },
    ],
    followUpStyle: "busy executive asking one sharp question",
    icon: "Rocket",
  },
  {
    id: "SALES_PITCH",
    name: "Sales Pitch",
    tagline: "Persuade and close",
    description: "Pitch a product or idea focusing on value, objections and a close.",
    promptCategories: ["BUSINESS", "PRESENTATION"],
    difficultyOptions: ALL,
    defaultDurationSec: 120,
    evaluationCriteria: [
      {
        name: "Customer value",
        description: "Frames benefits in terms of the customer's problem.",
      },
      { name: "Objection handling", description: "Addresses likely doubts proactively." },
      { name: "Close", description: "Asks for commitment clearly and confidently." },
    ],
    followUpStyle: "skeptical buyer raising an objection",
    icon: "BadgeDollarSign",
  },
  {
    id: "NETWORKING",
    name: "Networking",
    tagline: "Connect with confidence",
    description: "Small talk, introductions and conversation starters that build rapport.",
    promptCategories: ["ICE_BREAKER", "EVERYDAY_LIFE"],
    difficultyOptions: ALL,
    defaultDurationSec: 60,
    evaluationCriteria: [
      { name: "Warmth", description: "Sounds friendly, open and genuinely interested." },
      { name: "Conversation hooks", description: "Offers details others can build on." },
    ],
    followUpStyle: "friendly new acquaintance continuing the conversation",
    icon: "Users",
  },
  {
    id: "MEETING_SIMULATION",
    name: "Meeting Simulation",
    tagline: "Speak up in meetings",
    description: "Give updates, propose ideas and handle pushback like in a real meeting.",
    promptCategories: ["LEADERSHIP", "BUSINESS"],
    difficultyOptions: ALL,
    defaultDurationSec: 120,
    evaluationCriteria: [
      { name: "Bottom line first", description: "Leads with the key message or decision needed." },
      { name: "Collaboration", description: "Invites input and acknowledges others' concerns." },
      { name: "Actionability", description: "Ends with owners, next steps or a clear request." },
    ],
    followUpStyle: "colleague in the meeting pushing back or asking for details",
    icon: "CalendarClock",
  },
  {
    id: "DAILY_CHALLENGE",
    name: "Daily Challenge",
    tagline: "One prompt a day",
    description: "Today's shared prompt. Build the habit, one day at a time.",
    promptCategories: [],
    difficultyOptions: ["MEDIUM"],
    defaultDurationSec: 60,
    evaluationCriteria: [
      {
        name: "Consistency",
        description: "Delivers a complete, self-contained answer in the time.",
      },
    ],
    followUpStyle: "curious audience member",
    icon: "CalendarCheck",
  },
];

export const MODE_BY_ID = Object.fromEntries(PRACTICE_MODES.map((m) => [m.id, m])) as Record<
  PracticeMode,
  PracticeModeConfig
>;

export function getMode(id: PracticeMode): PracticeModeConfig {
  return MODE_BY_ID[id];
}
