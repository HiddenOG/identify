import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

export const PROJECTS_TAG = "projects";

const httpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Links must start with http:// or https://");

/** What the editor submits. Empty strings mean "not set". */
export const projectInputSchema = z.object({
  title: z.string().trim().min(1, "Give your project a title.").max(140),
  summary: z.string().trim().max(280),
  body_md: z.string().max(100_000),
  cover_url: httpsUrl,
  demo_url: httpsUrl,
  repo_url: httpsUrl,
  tags: z
    .string()
    .transform((raw) =>
      [...new Set(raw.split(",").map((t) => t.trim().toLowerCase().replace(/\s+/g, "-")).filter(Boolean))],
    )
    .pipe(z.array(z.string().regex(/^[a-z0-9+#.-]{1,30}$/, "Tags may use letters, numbers, + # . -")).max(8, "Use at most 8 tags.")),
});

export type ProjectInput = z.infer<typeof projectInputSchema>;

export type ProjectRow = {
  id: string;
  author_id: string;
  slug: string;
  title: string;
  summary: string | null;
  body_md: string;
  cover_url: string | null;
  demo_url: string | null;
  repo_url: string | null;
  tags: string[];
  status: "draft" | "published";
  published_at: string | null;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
};

export type ProjectAuthor = { username: string; full_name: string | null; avatar_url: string | null };
export type ProjectWithAuthor = ProjectRow & { author: ProjectAuthor };

// The hint is required: likes/comments create other paths between projects and profiles.
const WITH_AUTHOR = "*, author:profiles!projects_author_id_fkey(username, full_name, avatar_url)";

export function slugify(title: string) {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return base || "project";
}

export function projectHref(username: string, slug: string) {
  return `/${username}/${slug}`;
}

/** Rough reading time, Medium-style. */
export function readingMinutes(markdown: string) {
  return Math.max(1, Math.round(markdown.split(/\s+/).filter(Boolean).length / 220));
}

export function formatDate(iso: string | null) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export async function getFeedByTag(supabase: SupabaseClient, tag: string, limit = 50) {
  const { data, error } = await supabase
    .from("projects")
    .select(WITH_AUTHOR)
    .eq("status", "published")
    .contains("tags", [tag])
    .order("published_at", { ascending: false })
    .limit(limit)
    .returns<ProjectWithAuthor[]>();
  logError("getFeedByTag", error);
  return data ?? [];
}

/** Characters that would break PostgREST filter syntax or act as LIKE wildcards. */
export function cleanSearchTerm(q: string) {
  return q.replace(/[%_,()*\\:"'{}]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

export async function searchProjects(supabase: SupabaseClient, q: string) {
  const term = cleanSearchTerm(q);
  if (!term) return [];
  const tag = term.toLowerCase().replace(/\s+/g, "-");
  const filters = [`title.ilike.%${term}%`, `summary.ilike.%${term}%`];
  if (/^[a-z0-9+#.-]{1,30}$/.test(tag)) filters.push(`tags.cs.{${tag}}`);

  const { data, error } = await supabase
    .from("projects")
    .select(WITH_AUTHOR)
    .eq("status", "published")
    .or(filters.join(","))
    .order("like_count", { ascending: false })
    .limit(30)
    .returns<ProjectWithAuthor[]>();
  logError("searchProjects", error);
  return data ?? [];
}

/** How many published projects use each tag (for the topics directory). */
export async function getTagCounts(supabase: SupabaseClient) {
  const { data, error } = await supabase.from("projects").select("tags").eq("status", "published");
  logError("getTagCounts", error);
  const counts: Record<string, number> = {};
  for (const row of data ?? []) for (const t of row.tags as string[]) counts[t] = (counts[t] ?? 0) + 1;
  return counts;
}

/** Most-used tags across recent published projects. */
export function topTags(projects: ProjectRow[], limit = 12) {
  const counts = new Map<string, number>();
  for (const p of projects) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([tag]) => tag);
}

/** Query errors would otherwise render as an empty feed; surface them in the server log. */
function logError(where: string, error: { message: string } | null) {
  if (error) console.error(`[projects.${where}]`, error.message);
}

export async function getFeed(supabase: SupabaseClient, limit = 30) {
  const { data, error } = await supabase
    .from("projects")
    .select(WITH_AUTHOR)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(limit)
    .returns<ProjectWithAuthor[]>();
  logError("getFeed", error);
  return data ?? [];
}

const TRENDING_DAYS = 30;

/**
 * Projects getting attention lately: likes and responses (responses count double), decayed by age
 * so a fresh project with a few likes outranks an old one with many. Hacker News-style gravity.
 */
export async function getTrending(supabase: SupabaseClient, limit = 20) {
  const since = new Date(Date.now() - TRENDING_DAYS * 86_400_000).toISOString();
  const { data, error } = await supabase
    .from("projects")
    .select(WITH_AUTHOR)
    .eq("status", "published")
    .gte("published_at", since)
    .order("like_count", { ascending: false })
    .limit(100)
    .returns<ProjectWithAuthor[]>();
  logError("getTrending", error);

  const now = Date.now();
  const score = (p: ProjectRow) => {
    const ageDays = (now - new Date(p.published_at ?? p.created_at).getTime()) / 86_400_000;
    return (p.like_count + 2 * p.comment_count + 1) / (ageDays + 2) ** 1.5;
  };
  return (data ?? [])
    .filter((p) => p.like_count + p.comment_count > 0)
    .toSorted((a, b) => score(b) - score(a))
    .slice(0, limit);
}

/** Published projects by any of the given authors, newest first (the "Following" feed). */
export async function getFeedByAuthors(supabase: SupabaseClient, authorIds: string[], limit = 50) {
  if (!authorIds.length) return [];
  const { data, error } = await supabase
    .from("projects")
    .select(WITH_AUTHOR)
    .eq("status", "published")
    .in("author_id", authorIds)
    .order("published_at", { ascending: false })
    .limit(limit)
    .returns<ProjectWithAuthor[]>();
  logError("getFeedByAuthors", error);
  return data ?? [];
}

/** Published projects for a profile; includes drafts when the client is the author (RLS decides). */
export async function getProjectsByAuthor(supabase: SupabaseClient, authorId: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("author_id", authorId)
    .order("published_at", { ascending: false, nullsFirst: true })
    .returns<ProjectRow[]>();
  logError("getProjectsByAuthor", error);
  return data ?? [];
}

export async function getProject(supabase: SupabaseClient, username: string, slug: string) {
  const { data, error } = await supabase
    .from("projects")
    .select("*, author:profiles!projects_author_id_fkey!inner(username, full_name, avatar_url)")
    .eq("author.username", username.toLowerCase())
    .eq("slug", slug)
    .maybeSingle<ProjectWithAuthor>();
  logError("getProject", error);
  return data;
}
