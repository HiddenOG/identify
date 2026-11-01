"use server";

import { getNotifications } from "@/lib/notifications";
import { projectHref } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";
import { relativeTime } from "@/lib/time";

export type MenuNotification = {
  id: string;
  type: "like" | "comment" | "follow";
  unread: boolean;
  when: string;
  actorName: string;
  actorUsername: string;
  actorAvatar: string | null;
  projectTitle: string | null;
  comment: string | null;
  href: string;
};

/** Recent notifications for the header dropdown; opening it marks them read. */
export async function loadMenuNotifications(): Promise<MenuNotification[]> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return [];

  const [items, { data: me }] = await Promise.all([
    getNotifications(supabase, userId, 12),
    supabase.from("profiles").select("username").eq("id", userId).maybeSingle(),
  ]);

  if (items.some((n) => !n.read_at)) {
    await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
  }

  const now = Date.now();
  return items.map((n) => ({
    id: n.id,
    type: n.type,
    unread: !n.read_at,
    when: relativeTime(n.created_at, now),
    actorName: n.actor.full_name || n.actor.username,
    actorUsername: n.actor.username,
    actorAvatar: n.actor.avatar_url,
    projectTitle: n.project?.title ?? null,
    comment: n.comment?.body ?? null,
    // Likes and comments are always on the recipient's own projects.
    href:
      n.type === "follow" || !n.project || !me?.username
        ? `/${n.actor.username}`
        : `${projectHref(me.username, n.project.slug)}${n.type === "comment" ? "#responses" : ""}`,
  }));
}
