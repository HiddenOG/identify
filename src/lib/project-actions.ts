"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/profiles";
import { PROJECTS_TAG, projectHref, projectInputSchema, slugify } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

export type SaveProjectState = { error?: string };

/** Picks "<base>", "<base>-2", ... so slugs stay unique per author. */
async function uniqueSlug(supabase: Awaited<ReturnType<typeof createClient>>, authorId: string, title: string) {
  const base = slugify(title);
  const { data } = await supabase
    .from("projects")
    .select("slug")
    .eq("author_id", authorId)
    .like("slug", `${base}%`)
    .returns<{ slug: string }[]>();
  const taken = new Set((data ?? []).map((r) => r.slug));
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export async function saveProject(_: SaveProjectState, formData: FormData): Promise<SaveProjectState> {
  const supabase = await createClient();
  const { userId, profile } = await getCurrentUser(supabase);
  if (!userId) redirect("/login?next=/new");
  if (!profile?.username) redirect("/onboarding");

  const parsed = projectInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const publish = formData.get("intent") === "publish";
  const id = formData.get("id");
  const { cover_url, demo_url, repo_url, ...rest } = parsed.data;
  const fields = {
    ...rest,
    cover_url: cover_url || null,
    demo_url: demo_url || null,
    repo_url: repo_url || null,
    status: publish ? "published" : "draft",
  };

  let slug: string;
  if (typeof id === "string" && id) {
    const { data: existing } = await supabase
      .from("projects")
      .select("slug, published_at")
      .eq("id", id)
      .eq("author_id", userId)
      .maybeSingle<{ slug: string; published_at: string | null }>();
    if (!existing) return { error: "Project not found." };

    const { error } = await supabase
      .from("projects")
      .update({ ...fields, published_at: publish ? (existing.published_at ?? new Date().toISOString()) : existing.published_at })
      .eq("id", id);
    if (error) return { error: error.message };
    slug = existing.slug;
  } else {
    slug = await uniqueSlug(supabase, userId, rest.title);
    const { error } = await supabase.from("projects").insert({
      ...fields,
      author_id: userId,
      slug,
      published_at: publish ? new Date().toISOString() : null,
    });
    if (error) return { error: error.code === "23505" ? "You already have a project with this title." : error.message };
  }

  updateTag(PROJECTS_TAG);
  // Publishing shows the story; saving a draft keeps you in the editor (like Medium).
  redirect(publish ? projectHref(profile.username, slug) : `${projectHref(profile.username, slug)}/edit`);
}

/** Publishes a draft as it is (the Publish button on the draft page). */
export async function publishProject(formData: FormData) {
  const supabase = await createClient();
  const { userId, profile } = await getCurrentUser(supabase);
  if (!userId || !profile?.username) redirect("/login");

  const id = formData.get("id");
  if (typeof id !== "string") return;
  const { data: project } = await supabase
    .from("projects")
    .select("slug, title, published_at")
    .eq("id", id)
    .eq("author_id", userId)
    .maybeSingle<{ slug: string; title: string; published_at: string | null }>();
  if (!project) return;

  await supabase
    .from("projects")
    .update({ status: "published", published_at: project.published_at ?? new Date().toISOString() })
    .eq("id", id);
  updateTag(PROJECTS_TAG);
  redirect(projectHref(profile.username, project.slug));
}

export async function deleteProject(formData: FormData) {
  const supabase = await createClient();
  const { userId, profile } = await getCurrentUser(supabase);
  if (!userId || !profile?.username) redirect("/login");

  const id = formData.get("id");
  if (typeof id === "string") {
    await supabase.from("projects").delete().eq("id", id).eq("author_id", userId);
    updateTag(PROJECTS_TAG);
  }
  redirect(`/${profile.username}`);
}
