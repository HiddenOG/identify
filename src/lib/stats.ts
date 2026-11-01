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

/** First and last UTC day of a "YYYY-MM" month, as "YYYY-MM-DD". */
export function monthRange(month: string) {
  const [y, m] = month.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10), days: end.getUTCDate() };
}

/** The previous "YYYY-MM". */
export function previousMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 2, 1)).toISOString().slice(0, 7);
}

export function monthLabel(month: string) {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Every day of the month, zero-filled where nothing happened. */
export async function getDailyStats(supabase: SupabaseClient, month: string): Promise<DailyPoint[]> {
  const { start, end, days } = monthRange(month);
  const { data, error } = await supabase.rpc("my_daily_stats", { start_day: start, end_day: end });
  if (error) console.error("[stats.getDailyStats]", error.message);
  const rows = (data ?? []) as { day: string; views: number; reads: number }[];
  const byDay = new Map(rows.map((r) => [r.day, r]));
  return Array.from({ length: days }, (_, i) => {
    const day = `${month}-${String(i + 1).padStart(2, "0")}`;
    const row = byDay.get(day);
    return { day, views: Number(row?.views ?? 0), reads: Number(row?.reads ?? 0) };
  });
}

export async function getPeriodTotals(supabase: SupabaseClient, month: string): Promise<PeriodTotals> {
  const { start, end } = monthRange(month);
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
