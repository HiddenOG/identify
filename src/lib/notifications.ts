import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectAuthor } from "@/lib/projects";

export type NotificationRow = {
  id: string;
  type: "like" | "comment" | "follow" | "portfolio_claimed" | "portfolio_claim_request" | "featured" | "story_featured";
  read_at: string | null;
  created_at: string;
  actor: ProjectAuthor;
  project: { slug: string; title: string } | null;
  comment: { body: string } | null;
  /** For the Discover admin notifications (someone claimed, or asked to claim, a listing). */
  portfolio: { name: string } | null;
};

// Hints are required: notifications has two foreign keys to profiles.
const WITH_DETAILS =
  "id, type, read_at, created_at, actor:profiles!notifications_actor_id_fkey(username, full_name, avatar_url), project:projects(slug, title), comment:comments(body), portfolio:portfolios(name)";

export async function getNotifications(supabase: SupabaseClient, userId: string, limit = 50) {
  const query = (select: string) =>
    supabase.from("notifications").select(select).eq("user_id", userId).order("created_at", { ascending: false }).limit(limit).returns<NotificationRow[]>();
  let { data, error } = await query(WITH_DETAILS);
  if (error) {
    // Before the discover_activity migration there's no portfolio link; don't lose the bell over it.
    ({ data, error } = await query(WITH_DETAILS.replace(", portfolio:portfolios(name)", "")));
    if (error) console.error("[notifications.getNotifications]", error.message);
  }
  return (data ?? []).map((n) => ({ ...n, portfolio: n.portfolio ?? null }));
}

export async function getUnreadCount(supabase: SupabaseClient, userId: string) {
  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) console.error("[notifications.getUnreadCount]", error.message);
  return count ?? 0;
}
