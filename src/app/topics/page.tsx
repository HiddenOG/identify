import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { ChipScroller } from "@/components/chip-scroller";
import { getFeed, getTagCounts, PROJECTS_TAG, topTags } from "@/lib/projects";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { categorySlug, topicName, TOPIC_CATEGORIES } from "@/lib/topics";
import { TopicsExplorer } from "./topics-explorer";

export const metadata: Metadata = {
  title: "Explore topics",
  description: "Browse projects by role, stack, framework and field, in tech and beyond.",
};

async function getTopicData() {
  "use cache";
  cacheLife("minutes");
  cacheTag(PROJECTS_TAG);
  const supabase = createPublicClient();
  const [counts, feed] = await Promise.all([getTagCounts(supabase), getFeed(supabase)]);
  return { counts, trending: topTags(feed, 3) };
}

export default async function TopicsPage() {
  const { counts, trending } = hasSupabaseEnv ? await getTopicData() : { counts: {}, trending: [] as string[] };

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
      {/* Category chips jump to their section, like Medium's topic bar. */}
      <ChipScroller label="Categories">
        <span className="shrink-0 rounded-full bg-foreground px-4 py-1.5 text-sm text-background">Explore topics</span>
        {TOPIC_CATEGORIES.map((c) => (
          <a
            key={c.name}
            href={`#${categorySlug(c.name)}`}
            className="shrink-0 rounded-full border border-line px-4 py-1.5 text-sm text-muted hover:border-foreground hover:text-foreground"
          >
            {c.name}
          </a>
        ))}
      </ChipScroller>

      <h1 className="mt-10 text-center text-4xl font-bold tracking-tight sm:text-5xl">Explore topics</h1>
      <p className="mt-3 text-center text-muted">Roles, stacks, frameworks and fields, in tech and beyond.</p>

      <TopicsExplorer counts={counts} trending={trending.map((slug) => ({ slug, name: topicName(slug) ?? slug }))} />

      <p className="mt-12 rounded-lg bg-surface px-6 py-5 text-center text-sm">
        Don&apos;t see your field? Tag your project with it anyway; every tag gets its own page.{" "}
        <Link href="/new" className="underline underline-offset-4">
          Write a project
        </Link>
      </p>
    </main>
  );
}
