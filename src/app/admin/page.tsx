import {
  Activity,
  AlertTriangle,
  CalendarDays,
  Mic,
  Repeat,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminOverview, getAdminUsers } from "@/features/admin/service";
import { TrendBars, TrendLine } from "@/features/progress/components/lazy-charts";
import { StatTile } from "@/features/progress/components/stat-tile";
import { requireAdmin } from "@/lib/auth/admin";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };

const TZ = "Africa/Lagos";
const pct = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)}%` : "–");
const dateTime = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat("en-GB", {
        timeZone: TZ,
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(iso))
    : "–";
const shortDay = (day: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(
    new Date(`${day}T00:00:00Z`),
  );
const label = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, " ");

function Section({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  await requireAdmin();
  const sp = await searchParams;
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const q = (sp.q ?? "").slice(0, 100);
  const [o, u] = await Promise.all([getAdminOverview(), getAdminUsers(page, q)]);
  const t = o.totals;
  const failed = o.health.statuses
    .filter((s) => s.status.endsWith("FAILED"))
    .reduce((sum, s) => sum + s.count, 0);
  const started7d = o.health.statuses.reduce((sum, s) => sum + s.count, 0);
  const pageHref = (p: number) =>
    `/admin?${new URLSearchParams({ ...(q ? { q } : {}), page: String(p) })}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin"
        description="How GetConfident is doing. Aggregates only; recordings and transcripts are never shown here."
      />

      {/* Overview */}
      <section aria-label="Overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={Users}
          label="Total users"
          value={String(t.users)}
          hint={`+${t.users7d} this week · +${t.users30d} in 30 days`}
        />
        <StatTile
          icon={UserCheck}
          label="Practised at least once"
          value={String(t.activated)}
          hint={`${pct(t.activated, t.users)} of sign-ups`}
        />
        <StatTile
          icon={Activity}
          label="Weekly practising users"
          value={String(t.weeklyActive)}
          hint={`${t.monthlyActive} in the last 30 days`}
        />
        <StatTile
          icon={Mic}
          label="Completed sessions"
          value={String(t.sessions)}
          hint={`${t.sessions7d} this week`}
        />
      </section>

      {/* Growth */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Sign-ups per day" description="Last 30 days (Lagos time)">
          <TrendBars
            title="Sign-ups"
            data={o.daily.map((d) => ({ label: shortDay(d.day), value: d.signups }))}
          />
        </Section>
        <Section title="Practice sessions per day" description="Completed sessions, last 30 days">
          <TrendBars
            title="Sessions"
            data={o.daily.map((d) => ({ label: shortDay(d.day), value: d.sessions }))}
          />
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Funnel */}
        <Section title="Funnel" description="Where people drop off, all time">
          <ol className="space-y-3">
            {o.funnel.map((f, i) => (
              <li key={f.step}>
                <div className="flex items-baseline justify-between text-sm">
                  <span>
                    {i + 1}. {f.step}
                  </span>
                  <span className="tabular-nums">
                    <span className="font-semibold">{f.count}</span>{" "}
                    <span className="text-muted-foreground">
                      ({pct(f.count, o.funnel[0].count)})
                    </span>
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{
                      width:
                        pct(f.count, o.funnel[0].count) === "–"
                          ? "0%"
                          : pct(f.count, o.funnel[0].count),
                    }}
                  />
                </div>
              </li>
            ))}
          </ol>
        </Section>

        {/* Quality */}
        <Section title="Are users improving?" description="Weekly average across all AI reports">
          {o.quality.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <TrendLine
                title="Average score"
                data={o.quality.map((w) => ({ label: shortDay(w.week), value: w.score }))}
                height={160}
              />
              <TrendLine
                title="Filler words per minute"
                data={o.quality.map((w) => ({ label: shortDay(w.week), value: w.fillers }))}
                domain={[0, "auto"]}
                height={160}
              />
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No reports yet.</p>
          )}
        </Section>
      </div>

      {/* Health */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Section title="Last 7 days" description="Every session started, by status">
          <ul className="space-y-1.5 text-sm">
            {o.health.statuses.map((s) => (
              <li key={s.status} className="flex justify-between">
                <span className={cn(s.status.endsWith("FAILED") && "text-destructive")}>
                  {label(s.status)}
                </span>
                <span className="tabular-nums">{s.count}</span>
              </li>
            ))}
            {o.health.statuses.length === 0 ? (
              <li className="text-muted-foreground">No sessions yet.</li>
            ) : null}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            Failure rate: {pct(failed, started7d)} · Started in last 24h: {o.health.startedLast24h}{" "}
            · Users at the daily cap ({o.health.dailyCap}): {o.health.usersAtDailyCap}
          </p>
        </Section>

        <Section title="Popular modes" description="Completed sessions, all time">
          <ul className="space-y-1.5 text-sm">
            {o.health.modes.map((m) => (
              <li key={m.mode} className="flex justify-between">
                <span>{label(m.mode)}</span>
                <span className="tabular-nums">{m.count}</span>
              </li>
            ))}
            {o.health.modes.length === 0 ? (
              <li className="text-muted-foreground">No sessions yet.</li>
            ) : null}
          </ul>
        </Section>

        <Section title="Recent failures" description="Latest 10 sessions that failed to process">
          {o.health.failures.length ? (
            <ul className="space-y-2 text-sm">
              {o.health.failures.map((f) => (
                <li key={f.id} className="flex gap-2">
                  <AlertTriangle
                    className="mt-0.5 size-4 shrink-0 text-destructive"
                    aria-hidden="true"
                  />
                  <div className="min-w-0">
                    <p className="truncate">
                      {label(f.status)} · {label(f.mode)}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {dateTime(f.at)} · {f.email}
                      {f.reason ? ` · ${f.reason}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">None. 🎉</p>
          )}
        </Section>
      </div>

      {/* Users */}
      <Section title={`Users (${u.total})`} description="Newest first. Search by name or email.">
        <form action="/admin" className="mb-4 flex gap-2" role="search">
          <label htmlFor="admin-q" className="sr-only">
            Search users
          </label>
          <input
            id="admin-q"
            name="q"
            defaultValue={q}
            placeholder="Search name or email"
            className="h-10 w-full max-w-sm rounded-lg border bg-background px-3 text-sm"
          />
          <button type="submit" className="h-10 rounded-lg border px-4 text-sm hover:bg-muted">
            Search
          </button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b">
                <th className="py-2 pr-3 font-medium">Name</th>
                <th className="py-2 pr-3 font-medium">Email</th>
                <th className="py-2 pr-3 font-medium">Goal</th>
                <th className="py-2 pr-3 font-medium">
                  <UserPlus className="mr-1 inline size-3.5" aria-hidden="true" />
                  Joined
                </th>
                <th className="py-2 pr-3 text-right font-medium">Sessions</th>
                <th className="py-2 pr-3 font-medium">
                  <Repeat className="mr-1 inline size-3.5" aria-hidden="true" />
                  Last practised
                </th>
                <th className="py-2 font-medium">
                  <CalendarDays className="mr-1 inline size-3.5" aria-hidden="true" />
                  Last seen
                </th>
              </tr>
            </thead>
            <tbody>
              {u.users.map((row) => (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="py-2 pr-3">
                    {row.name}
                    {!row.onboarded ? (
                      <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        not onboarded
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3 text-muted-foreground">{row.email}</td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {row.goal ? label(row.goal) : "–"}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">{dateTime(row.joined)}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{row.sessions}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{dateTime(row.lastPractised)}</td>
                  <td className="py-2 whitespace-nowrap">{dateTime(row.lastSeen)}</td>
                </tr>
              ))}
              {u.users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-muted-foreground">
                    No users found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        {u.pages > 1 ? (
          <nav aria-label="Users pages" className="mt-4 flex items-center justify-between text-sm">
            {page > 1 ? (
              <Link href={pageHref(page - 1)} className="underline-offset-4 hover:underline">
                ← Newer
              </Link>
            ) : (
              <span />
            )}
            <span className="text-muted-foreground">
              Page {page} of {u.pages}
            </span>
            {page < u.pages ? (
              <Link href={pageHref(page + 1)} className="underline-offset-4 hover:underline">
                Older →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        ) : null}
      </Section>
    </div>
  );
}
