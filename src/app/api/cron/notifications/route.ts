import { NextResponse } from "next/server";

import { runNotificationCron } from "@/features/notifications/service";
import { errorResponse } from "@/lib/api";
import { logger } from "@/lib/logger";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * Hourly job: sends due practice reminders and weekly summaries.
 * Protected by CRON_SECRET (Vercel Cron sends it as a Bearer token).
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret || provided !== secret) {
    logger.warn("cron.unauthorized", { path: "/api/cron/notifications" });
    return NextResponse.json(
      { error: { code: "AUTHORIZATION", message: "Not allowed." } },
      { status: 401 },
    );
  }
  try {
    const result = await runNotificationCron();
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error, "cron.notifications_failed");
  }
}
