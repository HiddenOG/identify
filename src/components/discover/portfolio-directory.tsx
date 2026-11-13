"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DirectoryTabs, useDirectoryView } from "@/components/discover/directory-tabs";
import { PortfolioCard, PortfolioHero } from "@/components/discover/portfolio-card";
import type { Portfolio } from "@/lib/discover/portfolios";
import { displayHost } from "@/lib/discover/host";

const TABS = [
  { id: "featured", label: "Featured" },
  { id: "all", label: "All" },
  { id: "developer", label: "Developers" },
  { id: "design", label: "Design" },
  { id: "data", label: "Data & AI" },
  { id: "other", label: "Other" },
] as const;

type Tab = (typeof TABS)[number]["id"];

const PAGE = 60;

function shortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/**
 * Discover's directory: Featured first (the newest featured portfolio large), All and the categories; a grid of preview cards by default, or a compact list.
 * Searching is the site-wide search in the header, which includes Discover.
 */
export function PortfolioDirectory({ portfolios }: { portfolios: Portfolio[] }) {
  const [tab, setTab] = useState<Tab>("featured");
  const [view, setView] = useDirectoryView("identify-discover-people-view");
  const [shown, setShown] = useState(PAGE);

  const results = useMemo(
    () => portfolios.filter((p) => tab === "all" || (tab === "featured" ? p.featured : p.category === tab)),
    [portfolios, tab],
  );
  // On Featured, the newest one leads, large.
  const lead = tab === "featured" ? results[0] : undefined;
  const others = lead ? results.slice(1) : results;
  const visible = others.slice(0, shown);

  return (
    <section>
      <DirectoryTabs
        label="Categories"
        tabs={TABS}
        active={tab}
        onSelect={(id) => {
          setTab(id);
          setShown(PAGE);
        }}
        view={view}
        onView={setView}
      />

      {results.length === 0 ? (
        <p className="py-12 text-center text-muted">
          {tab === "featured" ? "Nothing featured yet." : "Nothing in this category yet."}{" "}
          <Link href="/discover/suggest" className="text-foreground underline">
            Suggest one
          </Link>
        </p>
      ) : view === "list" ? (
        <ul className="mt-6 divide-y divide-line">
          {(lead ? [lead, ...visible] : visible).map((p) => {
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
        <>
          {lead && (
            <div className="mt-6">
              <PortfolioHero portfolio={lead} priority />
            </div>
          )}
          {visible.length > 0 && (
            <div className="mt-10 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((p) => (
                <PortfolioCard key={p.id} portfolio={p} />
              ))}
            </div>
          )}
        </>
      )}

      {shown < others.length && (
        <div className="mt-8 text-center">
          <button type="button" onClick={() => setShown((n) => n + PAGE)} className="rounded-full border border-foreground px-6 py-2 text-sm hover:bg-surface">
            Show more ({others.length - shown})
          </button>
        </div>
      )}
    </section>
  );
}
