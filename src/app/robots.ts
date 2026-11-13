import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/**
 * Crawl everything public (CVs, stories, Discover, topics); keep out the signed-in app, the editor
 * and auth pages, which have nothing for search and would only waste crawl budget.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/settings",
        "/messages",
        "/notifications",
        "/library",
        "/stats",
        "/stories",
        "/following",
        "/new",
        "/onboarding",
        "/login",
        "/reset-password",
        "/auth/",
        "/discover/claim/",
        "/discover/remove/",
        "/discover/suggest",
        "/*/edit",
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
