import { Suspense } from "react";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Link from "next/link";
import { ProjectCard } from "@/components/project-card";
import { getFeedByTag, PROJECTS_TAG } from "@/lib/projects";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { topicName } from "@/lib/topics";
import { createPublicClient } from "@/lib/supabase/public";

async function getCachedTagFeed(tag: string) {
  "use cache";
  cacheLife("minutes");
  cacheTag(PROJECTS_TAG);
  return getFeedByTag(createPublicClient(), tag);
}

export async function generateMetadata({ params }: PageProps<"/tags/[tag]">): Promise<Metadata> {
  const { tag } = await params;
  const slug = decodeURIComponent(tag).toLowerCase();
  const name = topicName(slug) ?? slug;
  return {
    title: `${name} projects`,
    description: `Projects and stories about ${name} on Identify: real work, written up by the people who built it.`,
    alternates: { canonical: `/tags/${encodeURIComponent(slug)}` },
  };
}

export default function TagPage({ params }: PageProps<"/tags/[tag]">) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <Suspense>
        <TagFeed params={params} />
      </Suspense>
    </main>
  );
}

async function TagFeed({ params }: Pick<PageProps<"/tags/[tag]">, "params">) {
  const tag = decodeURIComponent((await params).tag).toLowerCase();
  const projects = hasSupabaseEnv ? await getCachedTagFeed(tag) : [];

  return (
    <>
      <Link href="/topics" className="text-sm text-muted hover:text-foreground">
        ← Explore topics
      </Link>
      <h1 className="mt-2 mb-2 text-4xl font-bold tracking-tight">{topicName(tag) ?? tag}</h1>
      <p className="mb-10 text-muted">
        {projects.length} {projects.length === 1 ? "project" : "projects"}
      </p>
      {projects.length === 0 ? (
        <p className="text-muted">
          No projects with this tag yet.{" "}
          <Link href="/new" className="text-foreground underline">
            Post one.
          </Link>
        </p>
      ) : (
        projects.map((p) => <ProjectCard key={p.id} project={p} />)
      )}
    </>
  );
}
