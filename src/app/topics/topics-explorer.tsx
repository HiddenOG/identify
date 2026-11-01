"use client";

import { useState } from "react";
import Link from "next/link";
import { tagHref } from "@/components/tag-link";
import { SearchIcon } from "@/components/icons";
import { categorySlug, matchTopics, topicSlug, TOPIC_CATEGORIES, type TopicGroup } from "@/lib/topics";

const SHOWN = 5;

function Count({ n }: { n?: number }) {
  return n ? <span className="ml-1.5 text-xs text-muted tabular-nums">{n}</span> : null;
}

function Group({ group, counts, expanded, onMore }: { group: TopicGroup; counts: Record<string, number>; expanded: boolean; onMore: () => void }) {
  const topics = expanded ? group.topics : group.topics.slice(0, SHOWN);
  return (
    <div>
      <h3 className="mb-2 font-semibold">{group.name}</h3>
      <ul className="space-y-1.5 pl-3">
        {topics.map((name) => {
          const slug = topicSlug(name);
          return (
            <li key={slug}>
              <Link href={tagHref(slug)} className="text-muted hover:text-foreground">
                {name}
              </Link>
              <Count n={counts[slug]} />
            </li>
          );
        })}
        {!expanded && group.topics.length > SHOWN && (
          <li>
            <button type="button" onClick={onMore} className="text-sm text-muted underline underline-offset-4 hover:text-foreground">
              More
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}

/** Search box plus the category directory; typing switches to a flat list of matches. */
export function TopicsExplorer({ counts, trending }: { counts: Record<string, number>; trending: { slug: string; name: string }[] }) {
  const [query, setQuery] = useState("");
  // Expanded groups, keyed "Category/Group".
  const [open, setOpen] = useState<Set<string>>(new Set());
  const expand = (keys: string[]) => setOpen((prev) => new Set([...prev, ...keys]));
  const matches = matchTopics(query, 60);

  return (
    <>
      <label className="relative mx-auto mt-8 block max-w-md">
        <span className="sr-only">Search all topics</span>
        <SearchIcon size={20} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search all topics"
          className="w-full rounded-full bg-surface py-3 pr-5 pl-12 outline-none placeholder:text-muted focus:bg-surface-hover"
        />
      </label>
      {trending.length > 0 && (
        <p className="mt-4 text-center text-sm text-muted">
          Trending:{" "}
          {trending.map((t, i) => (
            <span key={t.slug}>
              {i > 0 && " · "}
              <Link href={tagHref(t.slug)} className="text-foreground hover:underline">
                {t.name}
              </Link>
            </span>
          ))}
        </p>
      )}

      {query.trim() ? (
        <section className="mt-12 border-t border-line pt-10">
          {matches.length === 0 ? (
            <p className="text-center text-muted">
              No topic called “{query.trim()}” yet. You can still tag a project with it when you write one.
            </p>
          ) : (
            <ul className="flex flex-wrap justify-center gap-2">
              {matches.map((t) => (
                <li key={t.slug}>
                  <Link href={tagHref(t.slug)} className="inline-flex items-center rounded-full bg-surface px-4 py-2 text-sm hover:bg-surface-hover">
                    {t.name}
                    <span className="ml-2 text-xs text-muted">{t.category}</span>
                    <Count n={counts[t.slug]} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <div className="mt-12 grid gap-x-12 border-t border-line pt-4 sm:grid-cols-2 lg:grid-cols-3">
          {TOPIC_CATEGORIES.map((c) => {
            const keys = c.groups.map((g) => `${c.name}/${g.name}`);
            const allOpen = c.groups.every((g, i) => open.has(keys[i]) || g.topics.length <= SHOWN);
            return (
              <section key={c.name} id={categorySlug(c.name)} className="scroll-mt-20 border-b border-line py-10">
                <h2 className="mb-6 text-2xl font-bold tracking-tight">{c.name}</h2>
                <div className="space-y-6">
                  {c.groups.map((g, i) => (
                    <Group key={g.name} group={g} counts={counts} expanded={open.has(keys[i])} onMore={() => expand([keys[i]])} />
                  ))}
                </div>
                {!allOpen && (
                  <button type="button" onClick={() => expand(keys)} className="mt-6 text-sm text-success hover:underline">
                    ⌄ Show all in “{c.name}”
                  </button>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}
