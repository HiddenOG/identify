import { cacheLife, cacheTag } from "next/cache";
import { PROFILES_TAG, type ProfileRow } from "@/lib/profiles";
import { createPublicClient } from "@/lib/supabase/public";
import type { PortfolioCategory } from "./categories";
import { getPublicPortfolios, PORTFOLIOS_TAG } from "./portfolios";

/** Cached public reads for Discover and the home page. */
export async function getCachedPortfolios(category?: PortfolioCategory) {
  "use cache";
  cacheLife("minutes");
  cacheTag(PORTFOLIOS_TAG);
  return getPublicPortfolios(createPublicClient(), category, category ? 60 : 200);
}

/** Newest members with a photo: Identify's own CV websites lead Discover. */
export async function getCachedNewMembers() {
  "use cache";
  cacheLife("minutes");
  cacheTag(PROFILES_TAG);
  const { data } = await createPublicClient()
    .from("profiles")
    .select("id, username, full_name, headline, avatar_url, open_to_work")
    .not("username", "is", null)
    .not("avatar_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(8)
    .returns<Pick<ProfileRow, "id" | "username" | "full_name" | "headline" | "avatar_url" | "open_to_work">[]>();
  return data ?? [];
}
