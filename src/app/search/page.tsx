import { Suspense } from "react";
import type { Metadata } from "next";
import { cacheLife, cacheTag } from "next/cache";
import Form from "next/form";
import Link from "next/link";
import { AuthorAvatar } from "@/components/author-avatar";
import { ChipScroller } from "@/components/chip-scroller";
import { SearchIcon } from "@/components/icons";
import { PersonLink } from "@/components/person-link";
import { ProjectCard } from "@/components/project-card";
import { RemoteImage } from "@/components/remote-image";
import { searchProfiles } from "@/lib/profiles";
import { cleanSearchTerm, formatDate, getTrending, projectHref, PROJECTS_TAG, searchProjects } from "@/lib/projects";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { categorySlug, TOPIC_CATEGORIES } from "@/lib/topics";

export const metadata: Metadata = { title: "Explore", robots: { index: false } };

async function getCachedTrending() {
  "use cache";
  cacheLife("minutes");
  cacheTag(PROJECTS_TAG);
  return getTrending(createPublicClient(), 10);
}

/** Medium's Explore tab: search, topic chips, and what's trending until you type something. */
export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <h1 className="mb-5 text-3xl font-bold tracking-tight">Explore</h1>
      <Suspense>
        <SearchResults searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function SearchResults({ searchParams }: Pick<PageProps<"/search">, "searchParams">) {
  const raw = (await searchParams).q;
  const q = typeof raw === "string" ? raw.trim() : "";
  const term = cleanSearchTerm(q);

  const supabase = hasSupabaseEnv && term ? createPublicClient() : null;
  const [projects, people] = supabase
    ? await Promise.all([searchProjects(supabase, term), searchProfiles(supabase, term)])
    : [[], []];
  const trending = !term && hasSupabaseEnv ? await getCachedTrending() : [];

  return (
    <>
      <Form action="/search" className="relative">
        <SearchIcon size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
        <input
          name="q"
          defaultValue={q}
          aria-label="Search"
          placeholder="Search projects, topics and people"
          className="w-full rounded-full bg-surface py-3 pr-5 pl-12 outline-none placeholder:text-muted focus:bg-surface-hover"
        />
      </Form>

      <div className="mt-4 mb-8 border-b border-line pb-6">
        <ChipScroller label="Topics">
          <Link href="/topics" className="shrink-0 rounded-full bg-foreground px-4 py-1.5 text-sm text-background">
            Explore topics
          </Link>
          <Link href="/discover" className="shrink-0 rounded-full bg-surface px-4 py-1.5 text-sm hover:bg-surface-hover">
            Discover people
          </Link>
          {TOPIC_CATEGORIES.map((c) => (
            <Link
              key={c.name}
              href={`/topics#${categorySlug(c.name)}`}
              className="shrink-0 rounded-full bg-surface px-4 py-1.5 text-sm hover:bg-surface-hover"
            >
              {c.name}
            </Link>
          ))}
        </ChipScroller>
      </div>

      {!term ? (
        <section>
          <h2 className="mb-6 text-2xl font-bold tracking-tight">Trending</h2>
          {trending.length === 0 ? (
            <p className="text-muted">Nothing trending yet. Projects show up here once they get likes and responses.</p>
          ) : (
            <ol className="space-y-8">
              {trending.map((p, i) => {
                const name = p.author.full_name || p.author.username;
                const href = projectHref(p.author.username, p.slug);
                return (
                  <li key={p.id} className="flex gap-4">
                    <span className="w-6 shrink-0 pt-0.5 text-lg text-muted">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/${p.author.username}`} className="mb-2 flex items-center gap-2 text-[13px] hover:underline">
                        <AuthorAvatar name={name} url={p.author.avatar_url} size={20} />
                        <span className="truncate">{name}</span>
                        <span className="shrink-0 text-muted">· {formatDate(p.published_at)}</span>
                      </Link>
                      <Link href={href} className="line-clamp-3 text-lg leading-snug font-bold tracking-tight hover:underline">
                        {p.title}
                      </Link>
                    </div>
                    {p.cover_url && (
                      <Link href={href} className="shrink-0 self-center" tabIndex={-1} aria-hidden>
                        <RemoteImage src={p.cover_url} sizes="112px" className="aspect-[3/2] w-24 object-cover sm:w-28" />
                      </Link>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </section>
      ) : (
        <>
          {people.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-4 text-sm font-semibold">People</h2>
              <ul className="space-y-4">
                {people.map((p) => (
                  <li key={p.id}>
                    <PersonLink person={p.view} />
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section>
            <h2 className="mb-6 border-b border-line pb-3 text-sm font-semibold">Projects</h2>
            {projects.length === 0 ? (
              <p className="text-muted">No projects match “{q}”.</p>
            ) : (
              projects.map((p) => <ProjectCard key={p.id} project={p} />)
            )}
          </section>
        </>
      )}
    </>
  );
}
