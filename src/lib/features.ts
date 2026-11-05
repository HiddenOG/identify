import type { SupabaseClient } from "@supabase/supabase-js";
import { cleanSearchTerm, type ProjectWithAuthor } from "@/lib/projects";

/**
 * Discoveries: editorial features Identify writes about someone's work. Each one is a normal
 * write-up linked to that person's Discover listing (projects.about_portfolio).
 */
export const FEATURE_SECTIONS = [
  { id: "builders", label: "The Builders", blurb: "Interesting people and their journeys" },
  { id: "projects", label: "The Projects", blurb: "Products, experiments and creations" },
  { id: "rising", label: "The Rising", blurb: "Emerging talent worth discovering" },
] as const;

export type FeatureSection = (typeof FEATURE_SECTIONS)[number]["id"];

export function isFeatureSection(value: unknown): value is FeatureSection {
  return FEATURE_SECTIONS.some((s) => s.id === value);
}

export function sectionInfo(id: string | null | undefined) {
  return FEATURE_SECTIONS.find((s) => s.id === id) ?? FEATURE_SECTIONS[1];
}

type Member = { username: string | null; full_name: string | null; avatar_url: string | null };

/**
 * The person a feature is about. Either someone on Discover (`listingId`, their own site in `url`,
 * and their Identify profile in `member` once they claim it) or an Identify member (`member` only).
 */
export type FeatureSubject = {
  listingId: string | null;
  name: string;
  role: string | null;
  description: string | null;
  url: string | null;
  image_url: string | null;
  member: Member | null;
};

/** A Discoveries story: one of Identify's write-ups in a section, about someone or about no one in particular. */
export type Feature = ProjectWithAuthor & { subject: FeatureSubject | null };

const LISTING = "id, name, role, description, url, image_url, member:profiles!portfolios_claimed_by_fkey(username, full_name, avatar_url)";
const PERSON = "username, full_name, avatar_url, headline";

type Listing = { id: string; name: string; role: string | null; description: string | null; url: string; image_url: string | null; member: Member | null };
type Person = Member & { headline: string | null };

const WITH_SUBJECT = `*, author:profiles!projects_author_id_fkey(username, full_name, avatar_url), listing:portfolios!projects_about_portfolio_fkey(${LISTING}), person:profiles!projects_about_member_fkey(${PERSON})`;

function toSubject(listing: Listing | null, person: Person | null): FeatureSubject | null {
  if (listing) {
    return { listingId: listing.id, name: listing.name, role: listing.role, description: listing.description, url: listing.url, image_url: listing.image_url, member: listing.member };
  }
  if (person?.username) {
    return { listingId: null, name: person.full_name || person.username, role: person.headline, description: null, url: null, image_url: null, member: person };
  }
  return null;
}

/** The published outline for a new feature, from the questions every good one answers. */
export const FEATURE_OUTLINE = `## The problem

What does it solve, and for whom?

## What caught our attention

The detail that made us stop and look.

## How it's built

Technologies, creative choices, trade-offs. Keep our commentary separate from the creator's own claims.

## What you can learn from it

## Explore it

Where to see the work for yourself.
`;

/** Published Discoveries stories (anything with a section), Editor's picks first, then newest. */
export async function getFeatures(supabase: SupabaseClient, section?: FeatureSection, limit = 30) {
  let query = supabase
    .from("projects")
    .select(WITH_SUBJECT)
    .eq("status", "published")
    .not("feature_section", "is", null);
  if (section) query = query.eq("feature_section", section);
  const { data, error } = await query
    .order("editors_pick", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(limit)
    .returns<(ProjectWithAuthor & { listing: Listing | null; person: Person | null })[]>();
  // Before the discoveries migration the columns don't exist; Discover just has no features yet.
  if (error && !/about_portfolio|about_member|feature_section|editors_pick|relationship/i.test(error.message)) {
    console.error("[features.getFeatures]", error.message);
  }
  return (data ?? []).map(({ listing, person, ...project }) => ({ ...project, subject: toSubject(listing, person) }));
}

/** Who a write-up is about, for its page; null for a normal write-up (or when that person is gone). */
export async function getFeatureSubject(supabase: SupabaseClient, project: { about_portfolio?: string | null; about_member?: string | null }) {
  if (project.about_portfolio) {
    const { data } = await supabase.from("portfolios").select(LISTING).eq("id", project.about_portfolio).maybeSingle<Listing>();
    return toSubject(data, null);
  }
  if (project.about_member) {
    const { data } = await supabase.from("profiles").select(PERSON).eq("id", project.about_member).maybeSingle<Person>();
    return toSubject(null, data);
  }
  return null;
}

/** Where the creator card points: their Identify profile when they have one, otherwise their own site. */
export function subjectHref(subject: FeatureSubject) {
  return subject.member?.username ? `/${subject.member.username}` : (subject.url ?? "/discover");
}

/** Someone an admin can write about, as the editor's search shows them. */
export type AboutChoice = {
  /** "l:<listing id>" (on Discover) or "m:<member id>". */
  value: string;
  name: string;
  /** "@username", or the listing's site. */
  detail: string;
  avatar_url: string | null;
  /** Their sharing image (listings), offered as the story's cover. */
  image_url: string | null;
};

const listingChoice = (l: { id: string; name: string; url: string; image_url: string | null }): AboutChoice => ({
  value: `l:${l.id}`,
  name: l.name,
  detail: l.url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
  avatar_url: null,
  image_url: l.image_url,
});

const memberChoice = (m: { id: string; username: string; full_name: string | null; avatar_url: string | null }): AboutChoice => ({
  value: `m:${m.id}`,
  name: m.full_name || m.username,
  detail: `@${m.username}`,
  avatar_url: m.avatar_url,
  image_url: null,
});

/** Members and Discover listings matching a name, username or site, for the editor's "About" search. */
export async function searchAbout(supabase: SupabaseClient, query: string): Promise<AboutChoice[]> {
  const term = cleanSearchTerm(query);
  if (!term) return [];
  const [members, listings] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .not("username", "is", null)
      .or(`full_name.ilike.%${term}%,username.ilike.%${term}%`)
      .limit(6)
      .returns<{ id: string; username: string; full_name: string | null; avatar_url: string | null }[]>(),
    // Claimed listings are left out: that person is found as a member.
    supabase
      .from("portfolios")
      .select("id, name, url, image_url")
      .eq("status", "listed")
      .or(`name.ilike.%${term}%,url.ilike.%${term}%`)
      .limit(6)
      .returns<{ id: string; name: string; url: string; image_url: string | null }[]>(),
  ]);
  return [...(members.data ?? []).map(memberChoice), ...(listings.data ?? []).map(listingChoice)];
}

/** The person a story is already about (or the listing from ?about=), shown picked in the editor. */
export async function getAboutChoice(supabase: SupabaseClient, ref: { about_portfolio?: string | null; about_member?: string | null }) {
  if (ref.about_portfolio && /^[0-9a-f-]{36}$/i.test(ref.about_portfolio)) {
    const { data } = await supabase.from("portfolios").select("id, name, url, image_url").eq("id", ref.about_portfolio).maybeSingle();
    return data ? listingChoice(data) : null;
  }
  if (ref.about_member) {
    const { data } = await supabase.from("profiles").select("id, username, full_name, avatar_url").eq("id", ref.about_member).maybeSingle();
    return data?.username ? memberChoice(data) : null;
  }
  return null;
}
