import { cacheLife, cacheTag } from "next/cache";
import { getFeatures, type FeatureSection } from "@/lib/features";
import { PROJECTS_TAG } from "@/lib/projects";
import { createPublicClient } from "@/lib/supabase/public";
import type { PortfolioCategory } from "./categories";
import { getPublicPortfolios, PORTFOLIOS_TAG } from "./portfolios";

/** Cached public read for Discover and the home page: only what an admin has listed. */
export async function getCachedPortfolios(category?: PortfolioCategory) {
  "use cache";
  cacheLife("minutes");
  cacheTag(PORTFOLIOS_TAG);
  return getPublicPortfolios(createPublicClient(), category, category ? 60 : 1000);
}

/** Cached published features (Discoveries); a new feature or a claim clears it. */
export async function getCachedFeatures(section?: FeatureSection, limit = 30) {
  "use cache";
  cacheLife("minutes");
  cacheTag(PROJECTS_TAG, PORTFOLIOS_TAG);
  return getFeatures(createPublicClient(), section, limit);
}
