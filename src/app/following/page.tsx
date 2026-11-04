import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthorAvatar } from "@/components/author-avatar";
import { FollowButton } from "@/components/follow-button";
import { ProjectCard } from "@/components/project-card";
import { SetupNotice } from "@/components/setup-notice";
import { getFollowedPeople, getFollowingIds, getSuggestedPeople } from "@/lib/follows";
import { getFeedByAuthors } from "@/lib/projects";
import { FOOTER_LINKS } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Following" };

type Person = { id: string; username: string; full_name: string | null; headline: string | null; avatar_url: string | null };

/** Like Medium's Following: stories from people you follow, the people themselves, and who to follow next. */
export default function FollowingPage({ searchParams }: PageProps<"/following">) {
  return (
    <main className="mx-auto flex max-w-6xl justify-center gap-12 px-4 sm:px-6 xl:gap-20">
      <section className="min-w-0 max-w-[680px] flex-1 py-10">
        <h1 className="text-4xl font-bold tracking-tight">Following</h1>
        {hasSupabaseEnv ? (
          <Suspense>
            <FollowingContent searchParams={searchParams} />
          </Suspense>
        ) : (
          <SetupNotice />
        )}
      </section>
      <aside className="hidden w-80 shrink-0 border-l border-line py-10 pl-8 lg:block">
        <div className="sticky top-22 space-y-8">
          {hasSupabaseEnv && (
            <Suspense>
              <WhoToFollow />
            </Suspense>
          )}
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
            {FOOTER_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>
    </main>
  );
}

async function signedIn() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login?next=/following");
  return { supabase, userId };
}

const chip = (active: boolean) =>
  `rounded-full px-4 py-1.5 text-sm ${active ? "bg-foreground text-background" : "border border-line text-muted hover:text-foreground"}`;

async function FollowingContent({ searchParams }: Pick<PageProps<"/following">, "searchParams">) {
  const tab = (await searchParams).tab === "people" ? "people" : "stories";
  const { supabase, userId } = await signedIn();
  const people = await getFollowedPeople(supabase, userId);

  return (
    <>
      <div className="mt-6 mb-8 flex flex-wrap gap-2 border-b border-line pb-6">
        <Link href="/following" className={chip(tab === "stories")}>
          Stories
        </Link>
        <Link href="/following?tab=people" className={`${chip(tab === "people")} inline-flex items-center gap-2`}>
          People you follow
          {people.length > 0 && (
            <span
              className={`grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-xs font-semibold ${
                tab === "people" ? "bg-background text-foreground" : "bg-surface text-foreground"
              }`}
            >
              {people.length}
            </span>
          )}
        </Link>
      </div>
      {tab === "people" ? <PeopleTab people={people} userId={userId} /> : <StoriesTab people={people} userId={userId} />}
    </>
  );
}

async function StoriesTab({ people, userId }: { people: Person[]; userId: string }) {
  const supabase = await createClient();
  if (people.length === 0) {
    const suggestions = await getSuggestedPeople(supabase, userId, [], 6);
    return (
      <div>
        <p className="text-lg font-semibold">Stories from people you follow show up here.</p>
        <p className="mt-1 text-muted">Follow a few builders to get started:</p>
        <PeopleList people={suggestions} following={false} />
        <Link href="/people" className="mt-6 inline-block text-sm text-muted hover:text-foreground">
          Find more people →
        </Link>
      </div>
    );
  }
  const projects = await getFeedByAuthors(supabase, people.map((p) => p.id));
  if (projects.length === 0) {
    return (
      <p className="text-muted">
        The {people.length === 1 ? "person" : `${people.length} people`} you follow haven&apos;t posted projects yet. When they do, they&apos;ll
        appear here.
      </p>
    );
  }
  return projects.map((p) => <ProjectCard key={p.id} project={p} />);
}

async function PeopleTab({ people, userId }: { people: Person[]; userId: string }) {
  const supabase = await createClient();
  const suggestions = await getSuggestedPeople(supabase, userId, people.map((p) => p.id), 5);
  return (
    <>
      <h2 className="font-semibold">
        {people.length} {people.length === 1 ? "person" : "people"}
      </h2>
      {people.length === 0 ? (
        <p className="mt-2 text-muted">You don&apos;t follow anyone yet.</p>
      ) : (
        <PeopleList people={people} following />
      )}
      {suggestions.length > 0 && (
        <>
          <h2 className="mt-12 font-semibold">Suggestions</h2>
          <PeopleList people={suggestions} following={false} />
        </>
      )}
    </>
  );
}

/** Rows of people with a Follow / Following button, like Medium's "Refine recommendations". */
function PeopleList({ people, following }: { people: Person[]; following: boolean }) {
  return (
    <ul className="mt-4 space-y-5">
      {people.map((p) => {
        const name = p.full_name || p.username;
        return (
          <li key={p.id} className="flex items-start gap-4">
            <Link href={`/${p.username}`} className="shrink-0">
              <AuthorAvatar name={name} url={p.avatar_url} size={48} />
            </Link>
            <Link href={`/${p.username}`} className="min-w-0 flex-1">
              <span className="block font-semibold hover:underline">{name}</span>
              <span className="line-clamp-2 text-sm text-muted">{p.headline || `@${p.username}`}</span>
            </Link>
            <FollowButton profileId={p.id} following={following} followers={0} signedIn loginHref="/login?next=/following" compact />
          </li>
        );
      })}
    </ul>
  );
}

async function WhoToFollow() {
  const { supabase, userId } = await signedIn();
  const ids = await getFollowingIds(supabase, userId);
  const people = await getSuggestedPeople(supabase, userId, ids, 4);
  if (people.length === 0) return null;
  return (
    <div>
      <h2 className="mb-4 font-semibold">Who to follow</h2>
      <ul className="space-y-4">
        {people.map((p) => {
          const name = p.full_name || p.username;
          return (
            <li key={p.id} className="flex items-start gap-3">
              <Link href={`/${p.username}`} className="shrink-0">
                <AuthorAvatar name={name} url={p.avatar_url} size={32} />
              </Link>
              <Link href={`/${p.username}`} className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold hover:underline">{name}</span>
                <span className="line-clamp-2 text-xs text-muted">{p.headline || `@${p.username}`}</span>
              </Link>
              <FollowButton profileId={p.id} following={false} followers={0} signedIn loginHref="/login?next=/following" compact />
            </li>
          );
        })}
      </ul>
      <Link href="/people" className="mt-4 block text-sm text-muted hover:text-foreground">
        See more suggestions
      </Link>
    </div>
  );
}
