import { Suspense } from "react";
import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { PersonLink } from "@/components/person-link";
import { SetupNotice } from "@/components/setup-notice";
import { findPeople } from "@/lib/profiles";
import { cleanSearchTerm } from "@/lib/projects";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = {
  title: "People",
  description: "Find builders by skill, location and availability.",
};

export default function PeoplePage({ searchParams }: PageProps<"/people">) {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="font-serif text-4xl font-bold">People</h1>
      <p className="mt-2 mb-8 text-muted">Find builders by skill, location and whether they&apos;re open to work.</p>
      {hasSupabaseEnv ? (
        <Suspense>
          <Directory searchParams={searchParams} />
        </Suspense>
      ) : (
        <SetupNotice />
      )}
    </main>
  );
}

const field = "w-full rounded-lg border border-line px-3 py-2 outline-none focus:border-foreground";

async function Directory({ searchParams }: Pick<PageProps<"/people">, "searchParams">) {
  const params = await searchParams;
  const text = (key: string) => {
    const v = params[key];
    return typeof v === "string" ? v.trim() : "";
  };
  const raw = { q: text("q"), skill: text("skill"), location: text("location") };
  const openToWork = params.open === "1";
  const filters = {
    q: cleanSearchTerm(raw.q),
    skill: cleanSearchTerm(raw.skill),
    location: cleanSearchTerm(raw.location),
    openToWork,
  };
  const filtered = Boolean(filters.q || filters.skill || filters.location || openToWork);
  const people = await findPeople(createPublicClient(), filters);

  return (
    <>
      <Form action="/people" className="mb-10 grid gap-3 rounded-xl border border-line p-4 sm:grid-cols-3">
        <label className="text-sm">
          <span className="mb-1 block text-muted">Name or headline</span>
          <input name="q" defaultValue={raw.q} placeholder="e.g. data engineer" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Skill or tool</span>
          <input name="skill" defaultValue={raw.skill} placeholder="e.g. Python" className={field} />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-muted">Location</span>
          <input name="location" defaultValue={raw.location} placeholder="e.g. Lagos" className={field} />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-3 sm:col-span-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="open" value="1" defaultChecked={openToWork} className="size-4 accent-foreground" />
            Open to work only
          </label>
          <span className="flex items-center gap-4">
            {filtered && (
              <Link href="/people" className="text-sm text-muted underline">
                Clear
              </Link>
            )}
            <button className="rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background">Search</button>
          </span>
        </div>
      </Form>

      <p className="mb-4 text-sm text-muted">
        {people.length === 60 ? "Showing the first 60" : `${people.length} ${people.length === 1 ? "person" : "people"}`}
      </p>
      {people.length === 0 ? (
        <p className="text-muted">No one matches these filters yet.</p>
      ) : (
        <ul className="divide-y divide-line">
          {people.map(({ id, view, cv }) => (
            <li key={id} className="py-4">
              <PersonLink person={view} size={44} />
              {/* A taste of their profile summary; with none, the role under the name says enough. */}
              {cv.summary && <p className="mt-2 line-clamp-2 pl-14 text-sm text-muted">{cv.summary}</p>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
