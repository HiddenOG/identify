import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectWithAuthor } from "@/lib/projects";

// Stats are kept in UTC days (like Medium), so month boundaries match the database.

export type DailyPoint = { day: string; views: number; reads: number };
export type PeriodTotals = { views: number; reads: number; likes: number; responses: number; followers: number };
export type StoryStats = Map<string, { views: number; reads: number }>;

/** "2026-10" for the current UTC month. */
export function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

/** The previous "YYYY-MM". */
export function previousMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_RANGE_DAYS = 366;

/** "YYYY-MM-DD" plus `n` days (UTC). */
export function addDays(day: string, n: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Days from `start` to `end`, counting both. */
export function daysInRange(start: string, end: string) {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000) + 1;
}

/**
 * The stats period from ?from=&to= (UTC days): defaults to this month so far, never in the
 * future, never before the account existed, at most a year long, and start ≤ end.
 */
export function statsRange(from: string, to: string, joined: string) {
  const today = new Date().toISOString().slice(0, 10);
  const first = joined.slice(0, 10);
  const valid = (d: string) => DAY.test(d) && !Number.isNaN(Date.parse(`${d}T00:00:00Z`));
  let end = valid(to) && to <= today ? to : today;
  let start = valid(from) ? from : `${today.slice(0, 7)}-01`;
  if (start < first) start = first;
  if (start > end) [start, end] = [end, start];
  if (daysInRange(start, end) > MAX_RANGE_DAYS) start = addDays(end, -(MAX_RANGE_DAYS - 1));
  return { start, end, today, first };
}

const formatDay = (day: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });

/** "Nov 1 – Nov 4, 2026", or "Oct 30, 2025 – Jan 2, 2026" across years. */
export function rangeLabel(start: string, end: string) {
  const full: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  if (start === end) return formatDay(start, full);
  const sameYear = start.slice(0, 4) === end.slice(0, 4);
  return `${formatDay(start, sameYear ? { month: "short", day: "numeric" } : full)} – ${formatDay(end, full)}`;
}

/** Every day from `start` to `end`, zero-filled where nothing happened. */
export async function getDailyStats(supabase: SupabaseClient, start: string, end: string): Promise<DailyPoint[]> {
  const { data, error } = await supabase.rpc("my_daily_stats", { start_day: start, end_day: end });
  if (error) console.error("[stats.getDailyStats]", error.message);
  const rows = (data ?? []) as { day: string; views: number; reads: number }[];
  const byDay = new Map(rows.map((r) => [r.day, r]));
  return Array.from({ length: daysInRange(start, end) }, (_, i) => {
    const day = addDays(start, i);
    const row = byDay.get(day);
    return { day, views: Number(row?.views ?? 0), reads: Number(row?.reads ?? 0) };
  });
}

export async function getPeriodTotals(supabase: SupabaseClient, start: string, end: string): Promise<PeriodTotals> {
  const { data, error } = await supabase.rpc("my_period_totals", { start_day: start, end_day: end }).maybeSingle<PeriodTotals>();
  if (error) console.error("[stats.getPeriodTotals]", error.message);
  return {
    views: Number(data?.views ?? 0),
    reads: Number(data?.reads ?? 0),
    likes: Number(data?.likes ?? 0),
    responses: Number(data?.responses ?? 0),
    followers: Number(data?.followers ?? 0),
  };
}

export async function getStoryStats(supabase: SupabaseClient): Promise<StoryStats> {
  const { data, error } = await supabase.rpc("my_story_stats");
  if (error) console.error("[stats.getStoryStats]", error.message);
  return new Map(
    (data ?? []).map((r: { project_id: string; views: number; reads: number }) => [
      r.project_id,
      { views: Number(r.views), reads: Number(r.reads) },
    ]),
  );
}

/** When each follower followed the user, oldest first (for the audience growth chart). */
export async function getFollowerDates(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("follows")
    .select("created_at")
    .eq("following_id", userId)
    .order("created_at", { ascending: true });
  if (error) console.error("[stats.getFollowerDates]", error.message);
  return (data ?? []).map((r) => r.created_at as string);
}

/** Projects the user saved, newest save first. */
export async function getBookmarkedProjects(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("bookmarks")
    .select("created_at, project:projects(*, author:profiles!projects_author_id_fkey(username, full_name, avatar_url))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .returns<{ created_at: string; project: ProjectWithAuthor | null }[]>();
  if (error) console.error("[stats.getBookmarkedProjects]", error.message);
  // RLS hides a saved project that has since gone back to draft.
  return (data ?? []).flatMap((r) => (r.project && r.project.status === "published" ? [r.project] : []));
}

/** Projects the user has opened, most recently opened first. */
export async function getHistory(supabase: SupabaseClient, userId: string, limit = 50) {
  const { data, error } = await supabase
    .from("reading_history")
    .select("viewed_at, project:projects(*, author:profiles!projects_author_id_fkey(username, full_name, avatar_url))")
    .eq("user_id", userId)
    .order("viewed_at", { ascending: false })
    .limit(limit)
    .returns<{ viewed_at: string; project: ProjectWithAuthor | null }[]>();
  if (error) console.error("[stats.getHistory]", error.message);
  // RLS hides a project that has since gone back to draft or been deleted.
  return (data ?? []).flatMap((r) => (r.project && r.project.status === "published" ? [r.project] : []));
}

export async function isBookmarked(supabase: SupabaseClient, userId: string | null, projectId: string) {
  if (!userId) return false;
  const { data } = await supabase
    .from("bookmarks")
    .select("project_id")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .maybeSingle();
  return Boolean(data);
}

/** Compact counts for stat tiles: 1,284 / 12.9K / 4.2M. */
export function compact(n: number) {
  return new Intl.NumberFormat("en-US", { notation: n >= 10_000 ? "compact" : "standard", maximumFractionDigits: 1 }).format(n);
}
