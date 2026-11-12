import type { SupabaseClient } from "@supabase/supabase-js";
import type { PortfolioCategory } from "./categories";

export const PORTFOLIOS_TAG = "portfolios";

export type PortfolioStatus = "pending" | "listed" | "claimed" | "removed";

export type Portfolio = {
  id: string;
  url: string;
  name: string;
  role: string | null;
  location: string | null;
  description: string | null;
  image_url: string | null;
  category: PortfolioCategory;
  status: PortfolioStatus;
  featured: boolean;
  source: "admin" | "suggested";
  submitted_by: string | null;
  claimed_by: string | null;
  created_at: string;
  listed_at: string | null;
  /** The Identify member who claimed it. */
  member: { username: string | null; full_name: string | null; avatar_url: string | null } | null;
};

const SELECT = "*, member:profiles!portfolios_claimed_by_fkey(username, full_name, avatar_url)";

/** Listed and claimed portfolios, featured first, then newest. Public: use the cookie-free client. */
export async function getPublicPortfolios(supabase: SupabaseClient, category?: PortfolioCategory, limit = 60) {
  let query = supabase.from("portfolios").select(SELECT).in("status", ["listed", "claimed"]);
  if (category) query = query.eq("category", category);
  const { data, error } = await query
    .order("featured", { ascending: false })
    .order("listed_at", { ascending: false, nullsFirst: false })
    .limit(limit)
    .returns<Portfolio[]>();
  if (error) console.error("[discover.getPublicPortfolios]", error.message);
  return data ?? [];
}

export async function getPortfolio(supabase: SupabaseClient, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const { data } = await supabase.from("portfolios").select(SELECT).eq("id", id).maybeSingle<Portfolio>();
  return data;
}

export async function isAdmin(supabase: SupabaseClient) {
  const { data } = await supabase.rpc("is_admin");
  return data === true;
}

/** Discover listings matching a search (name, role, place, site or blurb), for the site-wide search. */
export async function searchPortfolios(supabase: SupabaseClient, term: string, limit = 12) {
  if (!term) return [];
  const { data, error } = await supabase
    .from("portfolios")
    .select(SELECT)
    .eq("status", "listed") // claimed ones show up under People as members
    .or(`name.ilike.%${term}%,role.ilike.%${term}%,location.ilike.%${term}%,url.ilike.%${term}%,description.ilike.%${term}%`)
    .order("featured", { ascending: false })
    .limit(limit)
    .returns<Portfolio[]>();
  if (error) console.error("[discover.searchPortfolios]", error.message);
  return data ?? [];
}
