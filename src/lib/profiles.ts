import { parseCV, type CV } from "@/lib/cv/schema";
import { resolveTheme, type Theme } from "@/lib/themes";
import type { SupabaseClient } from "@supabase/supabase-js";

type Supabase = SupabaseClient;

/** Usernames that would collide with app routes. */
export const RESERVED_USERNAMES = new Set([
  "login", "signup", "logout", "auth", "onboarding", "settings", "new", "preview",
  "explore", "search", "tags", "api", "admin", "about", "help", "terms", "privacy",
  "people", "notifications", "following", "library", "stories", "stats", "topics", "messages", "discover", "reset-password",
]);

export const PROFILES_TAG = "profiles";

export const USERNAME_PATTERN = /^[a-z0-9][a-z0-9_-]{2,29}$/;

/** Holds the username a visitor claimed on the landing page until onboarding pre-fills it. */
export const CLAIM_COOKIE = "bf_claim";

/** The public fields a template needs about a person. */
export type ProfileView = {
  username: string;
  fullName: string | null;
  headline: string | null;
  location: string | null;
  avatarUrl: string | null;
  openToWork: boolean;
};

export type ProfileRow = {
  id: string;
  username: string | null;
  full_name: string | null;
  headline: string | null;
  location: string | null;
  avatar_url: string | null;
  cv: unknown;
  template: string;
  theme: unknown;
  open_to_work: boolean;
  /** Story emails on (missing before the story_broadcast migration: treated as on). */
  email_updates?: boolean;
  created_at: string;
};

export type FullProfile = { id: string; view: ProfileView; cv: CV; theme: Theme; template: string };

export function toFullProfile(row: ProfileRow): FullProfile {
  return {
    id: row.id,
    view: {
      username: row.username ?? "",
      fullName: row.full_name,
      headline: row.headline,
      location: row.location,
      avatarUrl: row.avatar_url,
      openToWork: row.open_to_work,
    },
    cv: parseCV(row.cv),
    theme: resolveTheme(row.theme),
    template: row.template,
  };
}

export async function getProfileByUsername(supabase: Supabase, username: string) {
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle<ProfileRow>();
  return data ? toFullProfile(data) : null;
}

/** `term` must already be cleaned with cleanSearchTerm() from lib/projects. */
export async function searchProfiles(supabase: Supabase, term: string) {
  if (!term) return [];
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .not("username", "is", null)
    .or(`username.ilike.%${term}%,full_name.ilike.%${term}%,headline.ilike.%${term}%`)
    .limit(12)
    .returns<ProfileRow[]>();
  if (error) console.error("[profiles.searchProfiles]", error.message);
  return (data ?? []).map(toFullProfile);
}

export type PeopleFilters = { q: string; skill: string; location: string; openToWork: boolean };

/** The recruiter directory. Text filters must already be cleaned with cleanSearchTerm() from lib/projects. */
export async function findPeople(supabase: Supabase, { q, skill, location, openToWork }: PeopleFilters) {
  let query = supabase.from("profiles").select("*").not("username", "is", null);
  if (q) query = query.or(`username.ilike.%${q}%,full_name.ilike.%${q}%,headline.ilike.%${q}%`);
  // cv_search is skills + tools in lowercase (generated column, see the growth migration).
  if (skill) query = query.ilike("cv_search", `%${skill.toLowerCase()}%`);
  if (location) query = query.ilike("location", `%${location}%`);
  if (openToWork) query = query.eq("open_to_work", true);

  const { data, error } = await query
    .order("open_to_work", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(60)
    .returns<ProfileRow[]>();
  if (error) console.error("[profiles.findPeople]", error.message);
  return (data ?? []).map(toFullProfile);
}

/**
 * True when the visitor is signed in AND has a profile, the same rule the header uses. A bare
 * sign-in token isn't enough: a deleted account's token stays valid until it expires.
 */
export async function isSignedInMember(supabase: Supabase) {
  const { profile } = await getCurrentUser(supabase);
  return Boolean(profile);
}

/** The signed-in user and their profile row, or nulls. */
export async function getCurrentUser(supabase: Supabase) {
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { userId: null, profile: null, email: null };
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle<ProfileRow>();
  return { userId, profile, email };
}
