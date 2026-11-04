"use server";

import { refresh, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { PROJECTS_TAG } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

async function currentUserId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ?? null;
}

/** Likes or unlikes a project for the signed-in user. The like_count column is kept in sync by a DB trigger. */
export async function toggleLike(projectId: string): Promise<{ liked?: boolean; error?: string }> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return { error: "Sign in to like projects." };

  const { data: existing } = await supabase
    .from("likes")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("likes").delete().eq("project_id", projectId).eq("user_id", userId)
    : await supabase.from("likes").insert({ project_id: projectId, user_id: userId });
  if (error) return { error: error.message };

  updateTag(PROJECTS_TAG);
  return { liked: !existing };
}

export type CommentState = { error?: string };

const commentSchema = z.object({
  project_id: z.uuid(),
  body: z.string().trim().min(1, "Write something first.").max(5000, "Comments are limited to 5000 characters."),
});

export async function addComment(_: CommentState, formData: FormData): Promise<CommentState> {
  const parsed = commentSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return { error: "Sign in to comment." };

  const { error } = await supabase.from("comments").insert({ ...parsed.data, author_id: userId });
  if (error) return { error: error.message };

  updateTag(PROJECTS_TAG);
  return {};
}

/** Follows or unfollows a profile. A DB trigger sends (or withdraws) the follow notification. */
export async function toggleFollow(profileId: string): Promise<{ following?: boolean; error?: string }> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return { error: "Sign in to follow people." };
  if (userId === profileId) return { error: "You can't follow yourself." };

  const { data: existing } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", userId)
    .eq("following_id", profileId)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("follows").delete().eq("follower_id", userId).eq("following_id", profileId)
    : await supabase.from("follows").insert({ follower_id: userId, following_id: profileId });
  if (error) return { error: error.message };
  // Re-render with the new state; otherwise the button's optimistic "Following" snaps back.
  refresh();
  return { following: !existing };
}

/** Saves or unsaves a project to the signed-in user's Library. */
export async function toggleBookmark(projectId: string): Promise<{ saved?: boolean; error?: string }> {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return { error: "Sign in to save projects." };

  const { data: existing } = await supabase
    .from("bookmarks")
    .select("project_id")
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("bookmarks").delete().eq("user_id", userId).eq("project_id", projectId)
    : await supabase.from("bookmarks").insert({ user_id: userId, project_id: projectId });
  if (error) return { error: error.message };
  // Re-render with the new state; otherwise the button's optimistic "saved" snaps back.
  refresh();
  return { saved: !existing };
}

const VIEWER_COOKIE = "bf_vid";

/**
 * Counts a view (page opened) or a read (scrolled through the write-up) for Stats.
 * The database ignores authors' own visits and counts each viewer once per project, kind and day.
 */
export async function recordProjectEvent(projectId: string, kind: "view" | "read") {
  if (!z.uuid().safeParse(projectId).success || (kind !== "view" && kind !== "read")) return;
  const supabase = await createClient();
  const userId = await currentUserId(supabase);

  let anon: string | null = null;
  if (!userId) {
    const jar = await cookies();
    anon = jar.get(VIEWER_COOKIE)?.value ?? null;
    if (!anon) {
      anon = crypto.randomUUID();
      jar.set(VIEWER_COOKIE, anon, { httpOnly: true, sameSite: "lax", secure: true, maxAge: 60 * 60 * 24 * 365, path: "/" });
    }
  }

  const { error } = await supabase.rpc("record_project_event", { p_project: projectId, p_kind: kind, p_anon: anon });
  if (error) console.error("[social.recordProjectEvent]", error.message);

  // Signed-in readers also get it in Library → History (reopening moves it back to the top).
  if (userId && kind === "view") {
    const { error: historyError } = await supabase
      .from("reading_history")
      .upsert({ user_id: userId, project_id: projectId, viewed_at: new Date().toISOString() });
    if (historyError) console.error("[social.recordProjectEvent.history]", historyError.message);
  }
}

/** Empties the signed-in user's Library → History. */
export async function clearHistory() {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return;
  await supabase.from("reading_history").delete().eq("user_id", userId);
  refresh(); // re-render the Library page so the list empties
}

/** Marks every unread notification of the signed-in user as read. */
export async function markNotificationsRead() {
  const supabase = await createClient();
  const userId = await currentUserId(supabase);
  if (!userId) return;
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("user_id", userId).is("read_at", null);
}

/** RLS allows this for the comment's author or the project's owner. */
export async function deleteComment(formData: FormData) {
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const supabase = await createClient();
  await supabase.from("comments").delete().eq("id", id);
  updateTag(PROJECTS_TAG);
}
