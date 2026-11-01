import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectAuthor } from "@/lib/projects";

export type CommentWithAuthor = {
  id: string;
  project_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: ProjectAuthor;
};

export async function getComments(supabase: SupabaseClient, projectId: string) {
  const { data, error } = await supabase
    .from("comments")
    .select("*, author:profiles!comments_author_id_fkey(username, full_name, avatar_url)")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true })
    .returns<CommentWithAuthor[]>();
  if (error) console.error("[social.getComments]", error.message);
  return data ?? [];
}

export async function hasLiked(supabase: SupabaseClient, projectId: string, userId: string | null) {
  if (!userId) return false;
  const { data } = await supabase
    .from("likes")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .maybeSingle();
  return Boolean(data);
}
