import type { MetadataRoute } from "next";
import { cacheLife, cacheTag } from "next/cache";
import { FEATURE_SECTIONS } from "@/lib/features";
import { PROFILES_TAG } from "@/lib/profiles";
import { projectHref, PROJECTS_TAG } from "@/lib/projects";
import { SITE_URL } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

type ProfileRow = { username: string; updated_at: string };
type StoryRow = { slug: string; updated_at: string; tags: string[]; author: { username: string } | null };

/** Everyone's public pages: their CV, their stories, and the topics those stories are tagged with. */
async function getPublicPages() {
  "use cache";
  cacheLife("hours");
  cacheTag(PROFILES_TAG, PROJECTS_TAG);
  const supabase = createPublicClient();
  const [profiles, stories] = await Promise.all([
    supabase.from("profiles").select("username, updated_at").not("username", "is", null).limit(50000).returns<ProfileRow[]>(),
    supabase
      .from("projects")
      .select("slug, updated_at, tags, author:profiles!projects_author_id_fkey(username)")
      .eq("status", "published")
      .limit(50000)
      .returns<StoryRow[]>(),
  ]);
  return { profiles: profiles.data ?? [], stories: stories.data ?? [] };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const url = (path: string) => `${SITE_URL}${path}`;
  const fixed: MetadataRoute.Sitemap = [
    { url: url("/"), changeFrequency: "daily", priority: 1 },
    { url: url("/discover"), changeFrequency: "daily", priority: 0.9 },
    { url: url("/discover/features"), changeFrequency: "weekly", priority: 0.8 },
    ...FEATURE_SECTIONS.map((s) => ({ url: url(`/discover/features/${s.id}`), changeFrequency: "weekly" as const, priority: 0.6 })),
    { url: url("/people"), changeFrequency: "daily", priority: 0.7 },
    { url: url("/topics"), changeFrequency: "weekly", priority: 0.6 },
    { url: url("/preview/classic"), changeFrequency: "monthly", priority: 0.4 },
    { url: url("/about"), changeFrequency: "monthly", priority: 0.4 },
    { url: url("/privacy"), changeFrequency: "yearly", priority: 0.2 },
    { url: url("/terms"), changeFrequency: "yearly", priority: 0.2 },
  ];
  if (!hasSupabaseEnv) return fixed;

  const { profiles, stories } = await getPublicPages();
  const tags = [...new Set(stories.flatMap((s) => s.tags))];
  return [
    ...fixed,
    ...profiles.map((p) => ({ url: url(`/${p.username}`), lastModified: p.updated_at, changeFrequency: "weekly" as const, priority: 0.8 })),
    ...stories
      .filter((s) => s.author)
      .map((s) => ({ url: url(projectHref(s.author!.username, s.slug)), lastModified: s.updated_at, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...tags.map((t) => ({ url: url(`/tags/${encodeURIComponent(t)}`), changeFrequency: "weekly" as const, priority: 0.5 })),
  ];
}
