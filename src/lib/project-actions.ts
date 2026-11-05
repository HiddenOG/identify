"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { listForFeature } from "@/lib/discover/actions";
import { isAdmin, PORTFOLIOS_TAG } from "@/lib/discover/portfolios";
import { isFeatureSection } from "@/lib/features";
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

const UUID = /^[0-9a-f-]{36}$/i;

type Editorial = { portfolio: string | null; member: string | null; section: string | null; pick: boolean; featured: boolean };

/**
 * Reads the editor's admin-only editorial panel: who it's about ("l:<listing>", "m:<member>",
 * "new" or ""), its Discoveries section, Editor's pick and Featured. "new" lists the person on
 * Discover first, so a failure there saves nothing. Undefined when there's no panel or no admin.
 */
async function resolveEditorial(
  supabase: Awaited<ReturnType<typeof createClient>>,
  formData: FormData,
): Promise<Editorial | { error: string } | undefined> {
  if (formData.get("feature_panel") !== "1" || !(await isAdmin(supabase))) return undefined;
  const about = String(formData.get("about") ?? "");
  const section = formData.get("feature_section");
  const choices = {
    section: isFeatureSection(section) ? section : null,
    pick: formData.get("editors_pick") === "on",
    featured: formData.get("featured_home") === "on",
  };

  if (about.startsWith("l:") && UUID.test(about.slice(2))) return { portfolio: about.slice(2), member: null, ...choices };
  if (about.startsWith("m:") && UUID.test(about.slice(2))) return { portfolio: null, member: about.slice(2), ...choices };
  if (about === "new") {
    const field = (key: string) => String(formData.get(key) ?? "").trim();
    const { id, error } = await listForFeature({
      url: field("new_url"),
      name: field("new_name"),
      role: field("new_role"),
      category: field("new_category"),
      description: field("new_description"),
      image_url: field("new_image"),
      email: field("new_email"),
    });
    return id ? { portfolio: id, member: null, ...choices } : { error: error ?? "Couldn't add them to Discover." };
  }
  return { portfolio: null, member: null, ...choices };
}

export async function saveProject(_: SaveProjectState, formData: FormData): Promise<SaveProjectState> {
  const supabase = await createClient();
  const { userId, profile } = await getCurrentUser(supabase);
  if (!userId) redirect("/login?next=/new");
  if (!profile?.username) redirect("/onboarding");

  const parsed = projectInputSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Admins: the editorial panel's choices (undefined = not shown, leave as it is).
  const editorial = await resolveEditorial(supabase, formData);
  if (editorial && "error" in editorial) return { error: editorial.error };

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
  let projectId: string;
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
    projectId = id;
  } else {
    slug = await uniqueSlug(supabase, userId, rest.title);
    const { data: created, error } = await supabase
      .from("projects")
      .insert({
        ...fields,
        author_id: userId,
        slug,
        published_at: publish ? new Date().toISOString() : null,
      })
      .select("id")
      .single<{ id: string }>();
    if (error) return { error: error.code === "23505" ? "You already have a project with this title." : error.message };
    projectId = created.id;
  }

  if (editorial) {
    const { error } = await supabase.rpc("set_project_editorial", { target: projectId, ...editorial });
    if (error) {
      console.error("[projects.saveProject] editorial", error.message);
      return { error: "Saved, but the editorial choices didn't save. Has the 20261110000000_editorial migration been run?" };
    }
    updateTag(PORTFOLIOS_TAG);
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

/** Admins: put a story on the home feed's Featured tab, or take it off (Medium-style). */
export async function setStoryFeatured(formData: FormData) {
  const supabase = await createClient();
  if (!(await isAdmin(supabase))) return;
  const id = formData.get("id");
  if (typeof id !== "string") return;
  const { error } = await supabase.rpc("set_project_featured", { target: id, on_home: formData.get("on") === "true" });
  if (error) console.error("[projects.setStoryFeatured]", error.message);
  updateTag(PROJECTS_TAG);
  refresh();
}
