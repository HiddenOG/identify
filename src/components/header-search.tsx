"use client";

import { useState } from "react";
import Form from "next/form";
import Link from "next/link";
import { tagHref } from "@/components/tag-link";
import { SearchIcon } from "@/components/icons";
import { matchTopics } from "@/lib/topics";

const CompassIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m14.8 9.2-1.6 4-4 1.6 1.6-4z" />
  </svg>
);
const ArrowIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
    <path d="M6 14 14 6M7.5 6H14v6.5" />
  </svg>
);

/**
 * Header search, Medium-style: focusing it opens a panel with "Explore topics"; typing lists
 * matching topics and a full-search row. The panel shows while focus is inside (CSS focus-within).
 */
export function HeaderSearch() {
  const [query, setQuery] = useState("");
  const topics = matchTopics(query, 6);
  // Leave the panel once something in it is chosen.
  const done = () => (document.activeElement as HTMLElement | null)?.blur();

  const row = "flex items-center gap-3 px-5 py-3 text-sm text-muted hover:bg-surface hover:text-foreground focus:bg-surface focus:text-foreground focus:outline-none";

  return (
    <div className="group relative hidden md:block signed-out:hidden!" onKeyDown={(e) => e.key === "Escape" && done()}>
      <Form action="/search" onSubmit={done}>
        <SearchIcon size={20} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted" />
        <input
          name="q"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search"
          placeholder="Search"
          autoComplete="off"
          className="w-60 rounded-full bg-surface py-2 pr-4 pl-10 text-sm outline-none placeholder:text-muted focus:w-72 focus:bg-surface-hover"
        />
      </Form>

      {/* mousedown would blur the input (Safari doesn't focus clicked links) and hide the panel mid-click. */}
      <div
        onMouseDown={(e) => e.preventDefault()}
        className="invisible absolute top-full left-0 z-50 mt-2 w-80 overflow-hidden rounded-lg border border-line bg-background py-2 opacity-0 shadow-[0_8px_30px_rgb(0_0_0/0.18)] transition-opacity group-focus-within:visible group-focus-within:opacity-100"
      >
        {query.trim() ? (
          <>
            {topics.length > 0 && (
              <>
                <p className="px-5 pt-1 pb-2 text-xs font-medium tracking-[0.12em] text-muted uppercase">Topics</p>
                {topics.map((t) => (
                  <Link key={t.slug} href={tagHref(t.slug)} onClick={done} className={row}>
                    <span className="text-foreground">{t.name}</span>
                    <span className="ml-auto text-xs">{t.category}</span>
                  </Link>
                ))}
              </>
            )}
            <Link href={`/search?q=${encodeURIComponent(query.trim())}`} onClick={done} className={`${row} ${topics.length ? "mt-1 border-t border-line" : ""}`}>
              <SearchIcon size={18} />
              Search projects and people for “{query.trim()}”
            </Link>
          </>
        ) : (
          <Link href="/topics" onClick={done} className={row}>
            <CompassIcon />
            <span className="text-foreground">Explore topics</span>
            <span className="ml-auto">
              <ArrowIcon />
            </span>
          </Link>
        )}
      </div>
    </div>
  );
}
