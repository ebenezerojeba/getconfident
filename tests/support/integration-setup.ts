import { afterAll } from "vitest";

import { db } from "@/lib/db/client";

afterAll(async () => {
  await db.$disconnect();
});
