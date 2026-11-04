import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LineChart } from "@/components/line-chart";
import { SetupNotice } from "@/components/setup-notice";
import { getCurrentUser } from "@/lib/profiles";
import { formatDate, getProjectsByAuthor, projectHref, readingMinutes } from "@/lib/projects";
import {
  compact,
  currentMonth,
  getDailyStats,
  getFollowerDates,
  getPeriodTotals,
  getStoryStats,
  daysInRange,
  previousMonth,
  rangeLabel,
  statsRange,
} from "@/lib/stats";
import { SITE_NAME } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { DateRangePicker } from "./date-range-picker";
import { PeriodSelect } from "./period-select";

export const metadata: Metadata = { title: "Stats", robots: { index: false } };

const VIEWS = { name: "Views", color: "var(--chart-1)" };
const READS = { name: "Reads", color: "var(--chart-2)" };
const FOLLOWERS = { name: "Followers", color: "var(--chart-1)" };

export default function StatsPage({ searchParams }: PageProps<"/stats">) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
      <h1 className="text-5xl font-bold tracking-tight">Stats</h1>
      {hasSupabaseEnv ? (
        <Suspense>
          <Stats searchParams={searchParams} />
        </Suspense>
      ) : (
        <SetupNotice />
      )}
    </main>
  );
}

type Search = Awaited<PageProps<"/stats">["searchParams"]>;
const one = (v: Search[string]) => (typeof v === "string" ? v : "");

async function Stats({ searchParams }: Pick<PageProps<"/stats">, "searchParams">) {
  const params = await searchParams;
  const tab = one(params.tab) === "audience" ? "audience" : "stories";
  const supabase = await createClient();
  const { userId, profile } = await getCurrentUser(supabase);
  if (!userId) redirect("/login?next=/stats");
  if (!profile?.username) redirect("/onboarding");

  const tabClass = (active: boolean) => `-mb-px pb-4 ${active ? "border-b border-foreground" : "text-muted hover:text-foreground"}`;

  return (
    <>
      <div className="mt-10 flex gap-8 border-b border-line">
        <Link href="/stats" className={tabClass(tab === "stories")}>
          Stories
        </Link>
        <Link href="/stats?tab=audience" className={tabClass(tab === "audience")}>
          Audience
        </Link>
      </div>
      {tab === "stories" ? (
        <StoriesTab from={one(params.from)} to={one(params.to)} userId={userId} username={profile.username} joined={profile.created_at} />
      ) : (
        <AudienceTab year={one(params.year)} userId={userId} joined={profile.created_at} />
      )}
    </>
  );
}

function PeriodHeading({ title, range, children }: { title: string; range: string; children?: React.ReactNode }) {
  return (
    <div className="mt-12 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted">{range}</p>
      </div>
      {children}
    </div>
  );
}

function Tile({ value, label, delta }: { value: string; label: string; delta?: number }) {
  return (
    <div>
      <p className="flex items-center gap-1 text-5xl font-semibold tracking-tight">
        {value}
        {delta !== undefined && delta > 0 && <span className="text-2xl text-muted" aria-label="up">↑</span>}
      </p>
      <p className="mt-2">{label}</p>
    </div>
  );
}

async function StoriesTab({ from, to, userId, username, joined }: { from: string; to: string; userId: string; username: string; joined: string }) {
  const { start, end, today, first } = statsRange(from, to, joined);
  const supabase = await createClient();
  const [daily, totals, storyStats, projects] = await Promise.all([
    getDailyStats(supabase, start, end),
    getPeriodTotals(supabase, start, end),
    getStoryStats(supabase),
    getProjectsByAuthor(supabase, userId),
  ]);

  const days = daysInRange(start, end);
  const points = daily.map((d) => {
    const date = new Date(`${d.day}T00:00:00Z`);
    return {
      tick: date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" }),
      label: date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }),
      values: [d.views, d.reads],
    };
  });
  const published = projects.filter((p) => p.status === "published");

  return (
    <>
      <PeriodHeading
        title="Overview"
        range={`${rangeLabel(start, end)}${end === today ? " (today)" : ""} · ${days} ${days === 1 ? "day" : "days"}, UTC · Updated live`}
      >
        <DateRangePicker start={start} end={end} min={first} max={today} />
      </PeriodHeading>

      <div className="mt-10 flex flex-wrap gap-x-14 gap-y-8">
        <Tile value={compact(totals.views)} label="Views" />
        <Tile value={compact(totals.reads)} label="Reads" />
        <Tile value={compact(totals.likes)} label="Likes" />
        <Tile value={compact(totals.responses)} label="Responses" />
        <Tile value={`${totals.followers > 0 ? "+" : ""}${compact(totals.followers)}`} label="Followers" delta={totals.followers} />
      </div>

      <div className="mt-10">
        <LineChart
          series={[VIEWS, READS]}
          points={points}
          tickEvery={Math.max(1, Math.ceil(days / 5))}
          caption={`Daily views and reads, ${rangeLabel(start, end)}`}
        />
      </div>

      <div className="mt-16 border-t border-line" />
      <PeriodHeading title="Lifetime" range={`${formatDate(joined)} – Today (UTC)`} />

      {published.length === 0 ? (
        <p className="mt-8 text-muted">
          Publish a project to see its numbers here.{" "}
          <Link href="/new" className="text-foreground underline">
            Write one
          </Link>
        </p>
      ) : (
        <table className="mt-10 w-full text-left">
          <thead>
            <tr className="border-b border-line text-muted">
              <th className="py-4 font-normal">Story</th>
              {["Views", "Reads", "Likes", "Responses"].map((h) => (
                <th key={h} className="hidden w-24 py-4 text-right font-normal sm:table-cell">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {published.map((p) => {
              const s = storyStats.get(p.id) ?? { views: 0, reads: 0 };
              return (
                <tr key={p.id} className="border-b border-line align-top">
                  <td className="py-7 pr-4">
                    <p className="font-bold tracking-tight">{p.title}</p>
                    <p className="mt-2 text-[13px] text-muted">
                      {readingMinutes(p.body_md)} min read · {formatDate(p.published_at)} ·{" "}
                      <Link href={projectHref(username, p.slug)} className="underline">
                        View story
                      </Link>
                    </p>
                    {/* Phones: numbers under the title instead of in columns. */}
                    <p className="mt-2 text-sm text-muted tabular-nums sm:hidden">
                      {s.views} views · {s.reads} reads · {p.like_count} likes · {p.comment_count} responses
                    </p>
                  </td>
                  {[s.views, s.reads, p.like_count, p.comment_count].map((n, i) => (
                    <td key={i} className="hidden py-7 text-right text-lg tabular-nums sm:table-cell">
                      {compact(n)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      <p className="mt-6 text-xs text-muted">
        A view is someone opening a project; a read is someone reaching the end or staying 30 seconds. Your own visits aren&apos;t
        counted, and each person counts once per day.
      </p>
    </>
  );
}

async function AudienceTab({ year, userId, joined }: { year: string; userId: string; joined: string }) {
  const thisYear = new Date().getUTCFullYear();
  const firstYear = Number(joined.slice(0, 4));
  const years = Array.from({ length: thisYear - firstYear + 1 }, (_, i) => String(thisYear - i));
  const selected = years.includes(year) ? Number(year) : thisYear;

  const supabase = await createClient();
  const dates = await getFollowerDates(supabase, userId);
  const month = currentMonth();
  const lastMonth = previousMonth(month);
  const thisMonthGain = dates.filter((d) => d.startsWith(month)).length;
  const lastMonthGain = dates.filter((d) => d.startsWith(lastMonth)).length;

  // Followers at the end of each month of the selected year (cumulative), stopping at the current month.
  const points = Array.from({ length: 12 }, (_, m) => {
    const key = `${selected}-${String(m + 1).padStart(2, "0")}`;
    const date = new Date(Date.UTC(selected, m, 1));
    return {
      tick: date.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
      label: date.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
      values: [key > month ? null : dates.filter((d) => d.slice(0, 7) <= key).length],
    };
  });

  return (
    <>
      <PeriodHeading title="Lifetime" range={`${formatDate(joined)} – Today (UTC) · Updated live`} />
      <div className="mt-10">
        <Tile value={compact(dates.length)} label="Followers" />
        <p className={`mt-1 ${thisMonthGain > 0 ? "text-success" : "text-muted"}`}>
          {thisMonthGain > 0 ? `+${thisMonthGain}` : "No change"} this month
          {lastMonthGain > 0 && <span className="text-muted"> · +{lastMonthGain} last month</span>}
        </p>
      </div>

      <PeriodHeading title="Audience growth" range={`January 1, ${selected} – ${selected === thisYear ? "Today" : `December 31, ${selected}`} (UTC)`}>
        <PeriodSelect param="year" value={String(selected)} options={years.map((y) => ({ value: y, label: y }))} label="Year" />
      </PeriodHeading>

      <div className="mt-8 grid gap-8 md:grid-cols-[220px_1fr]">
        <div>
          <h3 className="text-lg font-bold">Followers</h3>
          <p className="mt-2 text-muted">People who follow you on {SITE_NAME}. Their new-project dots light up in your sidebar, and yours in theirs.</p>
        </div>
        <LineChart series={[FOLLOWERS]} points={points} caption={`Total followers by month, ${selected}`} />
      </div>
    </>
  );
}
