import { History, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/shared/states";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TOPIC_CATEGORIES } from "@/config/practice";
import { PRACTICE_MODES } from "@/config/practice-modes";
import { getHistory, historyQuerySchema } from "@/features/history/service";
import { SessionList } from "@/features/practice/components/recent-sessions";
import { requireUser } from "@/lib/auth/current-user";

export const metadata: Metadata = { title: "History" };

const selectClass =
  "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none dark:bg-input/30";

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const query = historyQuerySchema.parse(await searchParams);
  const { sessions, total, pages } = await getHistory(user.id, query);
  const filtered = Boolean(query.q || query.mode || query.category || query.from || query.to);

  const pageHref = (page: number) => {
    const p = new URLSearchParams();
    for (const [k, v] of Object.entries({ ...query, page })) if (v) p.set(k, String(v));
    return `/history?${p.toString()}`;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="History"
        description="Every session with its recording, transcript and AI report."
      />

      {/* Plain GET form: works without JavaScript and keeps filters in the URL. */}
      <form
        method="get"
        role="search"
        aria-label="Filter sessions"
        className="grid gap-3 rounded-2xl border bg-card p-4 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] md:items-end"
      >
        <div className="space-y-1.5">
          <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
            Search topics
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="q"
              name="q"
              defaultValue={query.q}
              placeholder="e.g. leadership"
              className="h-10 pl-9"
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="mode" className="text-xs font-medium text-muted-foreground">
            Mode
          </label>
          <select id="mode" name="mode" defaultValue={query.mode ?? ""} className={selectClass}>
            <option value="">All modes</option>
            {PRACTICE_MODES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="category" className="text-xs font-medium text-muted-foreground">
            Category
          </label>
          <select
            id="category"
            name="category"
            defaultValue={query.category ?? ""}
            className={selectClass}
          >
            <option value="">All categories</option>
            {TOPIC_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="from" className="text-xs font-medium text-muted-foreground">
            From
          </label>
          <Input id="from" name="from" type="date" defaultValue={query.from} className="h-10" />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="to" className="text-xs font-medium text-muted-foreground">
            To
          </label>
          <Input id="to" name="to" type="date" defaultValue={query.to} className="h-10" />
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="h-10">
            Apply
          </Button>
          {filtered ? (
            <Button asChild variant="ghost" className="h-10">
              <Link href="/history">Clear</Link>
            </Button>
          ) : null}
        </div>
      </form>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {total} {total === 1 ? "session" : "sessions"}
        {filtered ? " match your filters" : ""}
      </p>

      {sessions.length ? (
        <SessionList sessions={sessions} />
      ) : filtered ? (
        <EmptyState
          icon={Search}
          title="No matching sessions"
          description="Try a different search or clear the filters."
        >
          <Button asChild variant="outline">
            <Link href="/history">Clear filters</Link>
          </Button>
        </EmptyState>
      ) : (
        <EmptyState
          icon={History}
          title="No sessions yet"
          description="Your recordings, transcripts and AI reports will appear here."
        >
          <Button asChild>
            <Link href="/practice">Start practicing</Link>
          </Button>
        </EmptyState>
      )}

      {pages > 1 ? (
        <nav aria-label="Pagination" className="flex items-center justify-between">
          <Button asChild variant="outline" disabled={query.page <= 1}>
            {query.page > 1 ? (
              <Link href={pageHref(query.page - 1)}>Previous</Link>
            ) : (
              <span>Previous</span>
            )}
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {query.page} of {pages}
          </span>
          <Button asChild variant="outline">
            {query.page < pages ? (
              <Link href={pageHref(query.page + 1)}>Next</Link>
            ) : (
              <span aria-disabled="true">Next</span>
            )}
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
