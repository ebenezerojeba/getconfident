import { randomUUID } from "node:crypto";

import { TOPIC_BANK } from "@/features/topics/topic-bank";
import { hashPassword } from "@/lib/auth/password";
import { db } from "@/lib/db/client";

export const TEST_PASSWORD = "a very safe passphrase";

/** Unique suffix so tests never collide with data from earlier runs. */
export const uid = (prefix = "t") => `${prefix}-${randomUUID().slice(0, 8)}`;
export const uniqueEmail = (prefix = "user") => `${uid(prefix)}@example.com`;

let cachedHash: string | null = null;

export async function createTestUser(
  overrides: { email?: string; name?: string; onboarded?: boolean; timezone?: string } = {},
) {
  cachedHash ??= await hashPassword(TEST_PASSWORD);
  return db.user.create({
    data: {
      email: overrides.email ?? uniqueEmail(),
      name: overrides.name ?? "Test User",
      passwordHash: cachedHash,
      timezone: overrides.timezone ?? "UTC",
      onboardedAt: overrides.onboarded === false ? null : new Date(),
      preferences: { create: {} },
    },
  });
}

/** Ensures the topic bank and achievements exist (idempotent, like the seed). */
export async function ensureSeedData() {
  await db.topic.createMany({ data: TOPIC_BANK, skipDuplicates: true });
  const { ACHIEVEMENTS } = await import("@/features/achievements/catalog");
  await db.achievement.createMany({ data: ACHIEVEMENTS, skipDuplicates: true });
}
