import { cacheLife, cacheTag } from "next/cache";
import { createPublicClient } from "@/lib/supabase/public";
import type { PortfolioCategory } from "./categories";
import { getPublicPortfolios, PORTFOLIOS_TAG } from "./portfolios";

/** Cached public read for Discover and the home page: only what an admin has listed. */
export async function getCachedPortfolios(category?: PortfolioCategory) {
  "use cache";
  cacheLife("minutes");
  cacheTag(PORTFOLIOS_TAG);
  return getPublicPortfolios(createPublicClient(), category, category ? 60 : 200);
}
