"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PortfolioCard } from "@/components/discover/portfolio-card";
import type { Portfolio } from "@/lib/discover/portfolios";
import { displayHost } from "@/lib/discover/host";

const TABS = [
  { id: "all", label: "All" },
  { id: "developer", label: "Developers" },
  { id: "design", label: "Design" },
  { id: "data", label: "Data & AI" },
  { id: "other", label: "Other" },
] as const;

type Tab = (typeof TABS)[number]["id"];
type View = "list" | "grid";

const VIEW_KEY = "identify-discover-view";
const PAGE = 60;

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Discover's directory: search across everyone listed, category tabs along the top, and a compact
 * list or a grid of preview cards. Everything is already on the page, so filtering is instant.
 */
export function PortfolioDirectory({ portfolios }: { portfolios: Portfolio[] }) {
  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("list");
  const [shown, setShown] = useState(PAGE);
  const search = useRef<HTMLInputElement>(null);

  // Remember the list/grid choice on this device (a convenience; storage may be blocked).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the saved choice once after mount
      if (saved === "grid" || saved === "list") setView(saved);
    } catch {}
  }, []);
  function chooseView(next: View) {
    setView(next);
    try {
      localStorage.setItem(VIEW_KEY, next);
    } catch {}
  }

  // "/" jumps to the search box, like the directories people know.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (e.key !== "/" || target.closest("input, textarea, [contenteditable]")) return;
      e.preventDefault();
      search.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: portfolios.length };
    for (const p of portfolios) c[p.category] = (c[p.category] ?? 0) + 1;
    return c;
  }, [portfolios]);

  const q = query.trim().toLowerCase();
  const results = useMemo(
    () =>
      portfolios.filter(
        (p) =>
          (tab === "all" || p.category === tab) &&
          (!q || [p.name, p.role, p.location, p.description, displayHost(p.url)].some((v) => v?.toLowerCase().includes(q))),
      ),
    [portfolios, tab, q],
  );
  const visible = results.slice(0, shown);

  return (
    <section>
      <div className="flex gap-2">
        <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl bg-surface px-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="shrink-0 text-muted" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            ref={search}
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE);
            }}
            placeholder="Search portfolios by name, role, place or site"
            aria-label="Search portfolios"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-sm outline-none placeholder:text-muted"
          />
          <kbd className="hidden rounded-md border border-line bg-background px-1.5 text-xs text-muted sm:inline">/</kbd>
        </label>
        <div className="flex shrink-0 gap-1 rounded-xl bg-surface p-1" role="group" aria-label="View">
          {(["list", "grid"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => chooseView(v)}
              aria-pressed={view === v}
              aria-label={v === "list" ? "List view" : "Grid view"}
              className={`grid size-9 place-items-center rounded-lg ${view === v ? "bg-background shadow-sm" : "text-muted hover:text-foreground"}`}
            >
              {v === "list" ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M5 7h14M5 12h14M5 17h14" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <rect x="4" y="4" width="7" height="7" rx="1.5" />
                  <rect x="13" y="4" width="7" height="7" rx="1.5" />
                  <rect x="4" y="13" width="7" height="7" rx="1.5" />
                  <rect x="13" y="13" width="7" height="7" rx="1.5" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Categories, left to right. Scrolls sideways on phones. */}
      <div className="mt-3 flex gap-1 overflow-x-auto rounded-xl bg-surface p-1" role="tablist" aria-label="Categories">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => {
              setTab(t.id);
              setShown(PAGE);
            }}
            className={`flex-1 shrink-0 rounded-lg px-4 py-2 text-sm whitespace-nowrap ${
              tab === t.id ? "bg-background font-medium text-foreground shadow-sm" : "text-muted hover:text-foreground"
            }`}
          >
            {t.label} <span className="text-xs text-muted">{counts[t.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {results.length === 0 ? (
        <p className="py-12 text-center text-muted">
          No portfolios match{q ? ` “${query.trim()}”` : ""}.{" "}
          <Link href="/discover/suggest" className="text-foreground underline">
            Suggest one
          </Link>
        </p>
      ) : view === "list" ? (
        <ul className="mt-6 divide-y divide-line">
          {visible.map((p) => {
            const member = p.status === "claimed" ? p.member?.username : null;
            return (
              <li key={p.id} className="flex items-baseline gap-3 py-3">
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 flex-1 items-baseline gap-3 hover:[&>span:first-child]:underline">
                  <span className="shrink-0 font-medium">{p.name}</span>
                  <span className="truncate text-muted">{p.role || p.description || displayHost(p.url)}</span>
                </a>
                {member ? (
                  <Link href={`/${member}`} className="shrink-0 text-xs font-semibold text-success hover:underline">
                    On Identify
                  </Link>
                ) : (
                  p.location && <span className="hidden max-w-40 shrink-0 truncate text-xs text-muted sm:inline">{p.location}</span>
                )}
                <span className="w-14 shrink-0 text-right text-xs text-muted tabular-nums">{shortDate(p.listed_at ?? p.created_at)}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-6 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((p) => (
            <PortfolioCard key={p.id} portfolio={p} />
          ))}
        </div>
      )}

      {shown < results.length && (
        <div className="mt-8 text-center">
          <button type="button" onClick={() => setShown((n) => n + PAGE)} className="rounded-full border border-foreground px-6 py-2 text-sm hover:bg-surface">
            Show more ({results.length - shown})
          </button>
        </div>
      )}
    </section>
  );
}
