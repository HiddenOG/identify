import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { RemoteImage } from "@/components/remote-image";
import { SetupNotice } from "@/components/setup-notice";
import { getCurrentUser } from "@/lib/profiles";
import { formatDate, getProjectsByAuthor, projectHref, readingMinutes } from "@/lib/projects";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Your stories", robots: { index: false } };

export default function StoriesPage({ searchParams }: PageProps<"/stories">) {
  return (
    <main className="mx-auto max-w-[728px] px-4 py-12 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-4xl font-bold tracking-tight">Your stories</h1>
        <Link href="/new" className="rounded-full bg-foreground px-4 py-2 text-sm text-background hover:opacity-90">
          Write a project
        </Link>
      </div>
      {hasSupabaseEnv ? (
        <Suspense>
          <StoryList searchParams={searchParams} />
        </Suspense>
      ) : (
        <SetupNotice />
      )}
    </main>
  );
}

async function StoryList({ searchParams }: Pick<PageProps<"/stories">, "searchParams">) {
  const requested = (await searchParams).tab;
  const supabase = await createClient();
  const { userId, profile } = await getCurrentUser(supabase);
  if (!userId) redirect("/login?next=/stories");
  if (!profile?.username) redirect("/onboarding");

  const rows = await getProjectsByAuthor(supabase, userId);
  const published = rows.filter((p) => p.status === "published");
  const drafts = rows.filter((p) => p.status === "draft").toSorted((a, b) => b.updated_at.localeCompare(a.updated_at));
  // Like Medium: drafts first, unless there aren't any.
  const tab = requested === "published" || (requested !== "drafts" && drafts.length === 0) ? "published" : "drafts";
  const list = tab === "drafts" ? drafts : published;
  const tabClass = (active: boolean) => `-mb-px pb-4 ${active ? "border-b border-foreground" : "text-muted hover:text-foreground"}`;

  return (
    <>
      <div className="mt-8 flex gap-8 border-b border-line text-sm">
        <Link href="/stories?tab=drafts" className={tabClass(tab === "drafts")}>
          Drafts <span className="ml-1">{drafts.length}</span>
        </Link>
        <Link href="/stories?tab=published" className={tabClass(tab === "published")}>
          Published <span className="ml-1">{published.length}</span>
        </Link>
      </div>

      {list.length === 0 ? (
        <p className="py-10 text-muted">
          {tab === "drafts" ? "No drafts." : "You haven't published a story yet."}{" "}
          <Link href="/new" className="text-foreground underline">
            Write one
          </Link>
        </p>
      ) : (
        <>
          <p className="mt-6 mb-2 text-sm text-muted">Latest</p>
          <ul>
            {list.map((p) => {
              const view = projectHref(profile.username!, p.slug);
              const edit = `${view}/edit`;
              // Every story opens its page; drafts show a Publish bar there. Edit opens the editor.
              const href = view;
              const words = p.body_md.split(/\s+/).filter(Boolean).length;
              return (
                <li key={p.id} className="flex items-center gap-5 border-b border-line py-5">
                  <Link href={href} className="shrink-0" tabIndex={-1} aria-hidden>
                    {p.cover_url ? (
                      <RemoteImage src={p.cover_url} sizes="112px" className="aspect-[3/2] w-24 rounded bg-surface object-cover sm:w-28" />
                    ) : (
                      <span className="grid aspect-[3/2] w-24 place-items-center rounded bg-surface font-serif text-2xl text-muted sm:w-28">
                        {p.title.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link href={href} className="line-clamp-2 font-bold tracking-tight hover:underline">
                      {p.title}
                    </Link>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-1 text-[13px] text-muted">
                      <span>
                        {readingMinutes(p.body_md)} min read ({words.toLocaleString()} {words === 1 ? "word" : "words"})
                      </span>
                      <span>
                        · {p.status === "published" ? `Published ${formatDate(p.published_at)}` : `Updated ${formatDate(p.updated_at)}`}
                      </span>
                      {p.status === "published" && (
                        <span>
                          · {p.like_count} {p.like_count === 1 ? "like" : "likes"} · {p.comment_count}{" "}
                          {p.comment_count === 1 ? "response" : "responses"}
                        </span>
                      )}
                    </p>
                  </div>
                  <Link href={edit} className="shrink-0 text-sm text-muted hover:text-foreground">
                    Edit
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}
      {tab === "published" && published.length > 0 && (
        <p className="mt-6 text-sm text-muted">
          Views and reads are in{" "}
          <Link href="/stats" className="text-foreground underline">
            Stats
          </Link>
          .
        </p>
      )}
    </>
  );
}
