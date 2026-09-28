// Idempotent seed: safe to run repeatedly (upserts by natural keys).
import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { ACHIEVEMENTS } from "../src/features/achievements/catalog";
import { TOPIC_BANK } from "../src/features/topics/topic-bank";
import { PrismaClient } from "../src/generated/prisma/client";

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
});

async function main() {
  for (const a of ACHIEVEMENTS) {
    await db.achievement.upsert({
      where: { id: a.id },
      create: a,
      update: { name: a.name, description: a.description, icon: a.icon, sortOrder: a.sortOrder },
    });
  }

  const { count } = await db.topic.createMany({ data: TOPIC_BANK, skipDuplicates: true });

  const total = await db.topic.count();
  console.log(
    `[seed] achievements: ${ACHIEVEMENTS.length}, topics inserted: ${count}, topics total: ${total}`,
  );
}

main()
  .catch((error) => {
    console.error("[seed] failed", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
