/** Test-only seeding CLI (ESM). Usage: tsx e2e/seed-cli.mts <json> — prints created ids as JSON. */
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { mockCoachReport } from "../src/features/ai-coach/mock-coach";
import { normalizeReport } from "../src/features/ai-coach/normalize";
import { analyzeFillers } from "../src/features/filler-analysis/analyze";
import { computeSpeechMetrics } from "../src/features/transcription/metrics";
import { MOCK_TRANSCRIPT_TEXT, mockTranscript } from "../src/features/transcription/mock";
import {
  type PracticeMode,
  PrismaClient,
  type TopicCategory,
} from "../src/generated/prisma/client";

let client: PrismaClient | null = null;
function db() {
  client ??= new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
  });
  return client;
}

export type SeedSession = {
  daysAgo: number;
  score: number;
  fillerPerMinute?: number;
  mode?: PracticeMode;
  category?: TopicCategory;
  topic?: string;
};

/** Creates completed sessions (with transcript + validated report) for a user. */
export async function seedCompletedSessions(email: string, sessions: SeedSession[]) {
  const user = await db().user.findUniqueOrThrow({ where: { email: email.toLowerCase() } });
  const transcript = mockTranscript(MOCK_TRANSCRIPT_TEXT);
  const speech = computeSpeechMetrics(transcript);
  const fillers = analyzeFillers(transcript.text, {
    durationSec: speech.durationSec,
    words: transcript.words,
  });
  const ids: string[] = [];

  for (const [i, s] of sessions.entries()) {
    const completedAt = new Date(Date.now() - s.daysAgo * 86_400_000);
    const mode = s.mode ?? "IMPROMPTU";
    const topic = s.topic ?? `Seeded topic ${i + 1}: describe your ideal weekend.`;
    const raw = mockCoachReport(
      transcript.text,
      {
        topic,
        category: s.category ?? "EVERYDAY_LIFE",
        mode,
        difficulty: "MEDIUM",
        targetDurationSec: 60,
        elapsedSec: 60,
        withVideo: false,
      },
      speech,
      fillers,
    );
    raw.overallScore = s.score;
    const report = normalizeReport(raw, { speech, fillers });
    const created = await db().practiceSession.create({
      data: {
        userId: user.id,
        topicText: topic,
        category: s.category ?? "EVERYDAY_LIFE",
        mode,
        difficulty: "MEDIUM",
        targetDurationSec: 60,
        elapsedSec: 60,
        status: "COMPLETED",
        startedAt: completedAt,
        completedAt,
        createdAt: completedAt,
        transcript: {
          create: {
            text: transcript.text,
            language: "en",
            durationSec: transcript.durationSec,
            segments: transcript.segments,
            words: transcript.words ?? undefined,
            provider: "mock",
          },
        },
        analysis: {
          create: {
            overallScore: s.score,
            confidenceScore: Math.max(0, s.score - 5),
            grammarScore: Math.min(100, s.score + 5),
            clarityScore: s.score,
            wordsPerMinute: speech.wordsPerMinute,
            wordCount: speech.wordCount,
            fillerCount: fillers.totalFillers,
            fillerPerMinute: s.fillerPerMinute ?? fillers.perMinute ?? 0,
            longPauseCount: speech.longPauses.length,
            report: JSON.parse(JSON.stringify(report)),
            fillerAnalysis: JSON.parse(JSON.stringify({ ...fillers, speech })),
            provider: "mock",
            model: "mock",
          },
        },
      },
      select: { id: true },
    });
    ids.push(created.id);
  }
  return ids;
}

const input = JSON.parse(process.argv[2]) as { email: string; sessions: SeedSession[] };
const ids = await seedCompletedSessions(input.email, input.sessions);
await db().$disconnect();
process.stdout.write(JSON.stringify(ids));
