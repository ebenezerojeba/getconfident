import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { getMode } from "@/config/practice-modes";
import type { PracticeMode, SessionStatus } from "@/generated/prisma/enums";
import { scoreTone } from "@/features/ai-coach/components/report-parts";
import { cn } from "@/lib/utils";

import { isFailed, STATUS_LABEL } from "../state-machine";

export type SessionListItem = {
  id: string;
  topicText: string;
  mode: PracticeMode | string;
  status: SessionStatus;
  createdAt: Date;
  analysis: { overallScore: number } | null;
};

export function SessionList({ sessions }: { sessions: SessionListItem[] }) {
  return (
    <ul className="divide-y rounded-2xl border bg-card">
      {sessions.map((s) => {
        const href = s.status === "COMPLETED" ? `/sessions/${s.id}` : `/practice/${s.id}`;
        return (
          <li key={s.id}>
            <Link
              href={href}
              className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:bg-muted focus-visible:outline-none"
            >
              <span
                className={cn(
                  "flex size-11 shrink-0 items-center justify-center rounded-xl bg-muted text-sm font-semibold tabular-nums",
                  scoreTone(s.analysis?.overallScore ?? null),
                )}
                aria-label={s.analysis ? `Score ${s.analysis.overallScore}` : "No score yet"}
              >
                {s.analysis?.overallScore ?? "—"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{s.topicText}</span>
                <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  {getMode(s.mode as PracticeMode)?.name ?? s.mode}
                  <span aria-hidden="true">·</span>
                  <time dateTime={s.createdAt.toISOString()}>
                    {s.createdAt.toLocaleDateString("en", { month: "short", day: "numeric" })}
                  </time>
                  {s.status !== "COMPLETED" ? (
                    <Badge
                      variant={isFailed(s.status) ? "destructive" : "secondary"}
                      className="h-4 px-1.5 text-[10px]"
                    >
                      {STATUS_LABEL[s.status]}
                    </Badge>
                  ) : null}
                </span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
