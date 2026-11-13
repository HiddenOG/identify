"use server";

import { refresh, updateTag } from "next/cache";
import { after } from "next/server";
import { redirect } from "next/navigation";
import { autoTags } from "@/lib/auto-tags";
import { listForFeature } from "@/lib/discover/actions";
import { fetchImage, readSitePreview, SiteError } from "@/lib/discover/site";
import { isAdmin, PORTFOLIOS_TAG } from "@/lib/discover/portfolios";
import { isFeatureSection } from "@/lib/features";
import { sendEmails } from "@/lib/email";
import { getCurrentUser } from "@/lib/profiles";
import { SITE_URL } from "@/lib/site";
import { EMAIL_SETTINGS_URL, storyHtml, storySubject, storyText } from "@/lib/story-email";
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

type Editorial = { portfolio: string | null; member: string | null; section: string | null; pick: boolean; featured: boolean; notify: boolean };

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
    notify: formData.get("notify_members") === "on",
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

/**
 * "Tell all members": once a story with that box ticked is published, the database writes a bell
 * notification for every member and returns who wants the email; the emails go out after the
 * response (Resend), so publishing isn't held up. Runs once per story; a no-op otherwise.
 */
async function broadcastStory(supabase: Awaited<ReturnType<typeof createClient>>, projectId: string, author: string) {
  const { data, error } = await supabase.rpc("broadcast_story", { target: projectId });
  const recipients = (data ?? []) as { email: string; name: string }[];
  if (error) {
    console.error("[projects.broadcastStory]", error.message);
    return;
  }
  if (!recipients.length) return;
  const { data: story } = await supabase
    .from("projects")
    .select("slug, title, summary, cover_url, author:profiles!projects_author_id_fkey(username)")
    .eq("id", projectId)
    .single<{ slug: string; title: string; summary: string | null; cover_url: string | null; author: { username: string } }>();
  if (!story) return;

  const email = { title: story.title, summary: story.summary, coverUrl: story.cover_url, url: `${SITE_URL}${projectHref(story.author.username, story.slug)}`, author };
  after(async () => {
    const sent = await sendEmails(
      recipients.map((r) => ({
        to: r.email,
        subject: storySubject(email),
        html: storyHtml(email, r.name),
        text: storyText(email, r.name),
        headers: { "List-Unsubscribe": `<${EMAIL_SETTINGS_URL}>` },
      })),
    );
    console.log(`[projects.broadcastStory] emailed ${sent} of ${recipients.length} members about "${story.title}"`);
  });
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
    // Left empty: tag it from what it says (topic matching, no AI). Typed tags are kept as they are.
    tags: rest.tags.length ? rest.tags : autoTags({ title: rest.title, summary: rest.summary, body: rest.body_md }),
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
    const { notify, ...choices } = editorial;
    const { error } = await supabase.rpc("set_project_editorial", { target: projectId, ...choices });
    if (error) {
      console.error("[projects.saveProject] editorial", error.message);
      return { error: "Saved, but the editorial choices didn't save. Has the 20261110000000_editorial migration been run?" };
    }
    const { error: notifyError } = await supabase.rpc("set_notify_members", { target: projectId, notify });
    if (notifyError) {
      console.error("[projects.saveProject] notify", notifyError.message);
      return { error: "Saved, but \"Tell all members\" didn't save. Has the 20261111000000_story_broadcast migration been run?" };
    }
    updateTag(PORTFOLIOS_TAG);
    if (publish) await broadcastStory(supabase, projectId, profile.full_name || profile.username);
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
  if (await isAdmin(supabase)) await broadcastStory(supabase, id, profile.full_name || profile.username);
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

/**
 * A cover from a link: an image address as it is, or a website's preview picture (the one it
 * shows when shared). Copied into our storage so the story doesn't depend on their server.
 */
export async function coverFromLink(link: string): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { userId } = await getCurrentUser(supabase);
  if (!userId) return { error: "Sign in first." };

  let image = /^https?:\/\//i.test(link.trim()) ? await fetchImage(link.trim()) : null;
  if (!image) {
    try {
      const { imageUrl } = await readSitePreview(link);
      if (!imageUrl) return { error: "That site doesn't have a preview picture. Upload one instead." };
      image = await fetchImage(imageUrl);
    } catch (error) {
      return { error: error instanceof SiteError ? error.message : "Couldn't read that link. Try again." };
    }
  }
  if (!image) return { error: "Couldn't download that picture. Upload one instead." };

  // Storage policies only allow writes under the user's own id folder.
  const path = `${userId}/${crypto.randomUUID()}.${image.ext}`;
  const { error } = await supabase.storage.from("project-images").upload(path, image.bytes, { contentType: image.type });
  if (error) {
    console.error("[projects.coverFromLink]", error.message);
    return { error: "Couldn't save that picture. Try again." };
  }
  return { url: supabase.storage.from("project-images").getPublicUrl(path).data.publicUrl };
}
