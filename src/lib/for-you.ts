import type { SupabaseClient } from "@supabase/supabase-js";
import { getFollowingIds } from "@/lib/follows";
import type { ProjectWithAuthor } from "@/lib/projects";

type TaggedRow = { project_id: string; project: { tags: string[] } | null };

/**
 * The home page's "For you" tab, Medium-style: recent stories ranked for one reader. People you
 * follow count most, then topics you've liked, saved or read; featured and popular stories get
 * a nudge, and anything you've already read sinks. Your own stories are left out.
 */
export async function getForYou(supabase: SupabaseClient, userId: string, pool: ProjectWithAuthor[], limit = 30) {
  const [following, likes, saves, reads] = await Promise.all([
    getFollowingIds(supabase, userId),
    supabase.from("likes").select("project_id, project:projects(tags)").eq("user_id", userId).limit(100).returns<TaggedRow[]>(),
    supabase.from("bookmarks").select("project_id, project:projects(tags)").eq("user_id", userId).limit(100).returns<TaggedRow[]>(),
    supabase
      .from("reading_history")
      .select("project_id, project:projects(tags)")
      .eq("user_id", userId)
      .order("viewed_at", { ascending: false })
      .limit(100)
      .returns<TaggedRow[]>(),
  ]);

  // Likes and saves say more about taste than a read does.
  const topics = new Map<string, number>();
  const addTopics = (rows: TaggedRow[] | null, weight: number) => {
    for (const r of rows ?? []) for (const t of r.project?.tags ?? []) topics.set(t, (topics.get(t) ?? 0) + weight);
  };
  addTopics(likes.data, 2);
  addTopics(saves.data, 2);
  addTopics(reads.data, 1);

  const followed = new Set(following);
  const read = new Set((reads.data ?? []).map((r) => r.project_id));
  const now = Date.now();

  const score = (p: ProjectWithAuthor) => {
    let s = 1;
    if (followed.has(p.author_id)) s += 3;
    s += Math.min(4, p.tags.reduce((n, t) => n + Math.min(topics.get(t) ?? 0, 3), 0)) * 0.75;
    if (p.featured_at) s += 1.5;
    s += Math.log1p(p.like_count + 2 * p.comment_count) * 0.5;
    if (read.has(p.id)) s *= 0.25;
    const ageDays = (now - new Date(p.published_at ?? p.created_at).getTime()) / 86_400_000;
    return s / (ageDays + 2) ** 0.6;
  };

  const stories = pool
    .filter((p) => p.author_id !== userId)
    .map((p) => ({ p, s: score(p) }))
    .toSorted((a, b) => b.s - a.s)
    .slice(0, limit)
    .map(({ p }) => p);
  return { stories, tuned: followed.size > 0 || topics.size > 0 };
}
