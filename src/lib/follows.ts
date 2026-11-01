import type { SupabaseClient } from "@supabase/supabase-js";

export async function getFollowCounts(supabase: SupabaseClient, profileId: string) {
  const [followers, following] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", profileId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", profileId),
  ]);
  return { followers: followers.count ?? 0, following: following.count ?? 0 };
}

export async function isFollowing(supabase: SupabaseClient, followerId: string | null, followingId: string) {
  if (!followerId || followerId === followingId) return false;
  const { data } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", followerId)
    .eq("following_id", followingId)
    .maybeSingle();
  return Boolean(data);
}

export type FollowedPerson = { id: string; username: string; full_name: string | null; avatar_url: string | null; postedRecently: boolean };

/** People the user follows for the sidebar: those who posted in the last `days` days first, then by name. */
export async function getFollowedPeople(supabase: SupabaseClient, userId: string, days = 7): Promise<FollowedPerson[]> {
  const ids = await getFollowingIds(supabase, userId);
  if (!ids.length) return [];
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  const [{ data: people }, { data: recent }] = await Promise.all([
    supabase.from("profiles").select("id, username, full_name, avatar_url").in("id", ids),
    supabase.from("projects").select("author_id").eq("status", "published").gte("published_at", since).in("author_id", ids),
  ]);
  const recentAuthors = new Set((recent ?? []).map((r) => r.author_id as string));
  return (people ?? [])
    .filter((p) => p.username)
    .map((p) => ({ ...p, postedRecently: recentAuthors.has(p.id) }) as FollowedPerson)
    .sort(
      (a, b) =>
        Number(b.postedRecently) - Number(a.postedRecently) ||
        (a.full_name || a.username).localeCompare(b.full_name || b.username),
    );
}

/** Ids of everyone the user follows. */
export async function getFollowingIds(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase.from("follows").select("following_id").eq("follower_id", userId);
  if (error) console.error("[follows.getFollowingIds]", error.message);
  return (data ?? []).map((r) => r.following_id as string);
}
