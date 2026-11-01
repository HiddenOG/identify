import { createHash } from "node:crypto";
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

/**
 * The code a member puts on their site to prove it's theirs. Anyone can work it out, and that's
 * fine: only the site's owner can publish it there.
 */
export function claimCode(portfolioId: string, userId: string) {
  return `identify-verify-${createHash("sha256").update(`${portfolioId}:${userId}`).digest("hex").slice(0, 20)}`;
}

export function claimMetaTag(code: string) {
  return `<meta name="identify-verification" content="${code}">`;
}
