"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DirectoryTabs, useDirectoryView } from "@/components/discover/directory-tabs";
import { FeatureCard, FeatureHero } from "@/components/discover/feature-card";
import { FEATURE_SECTIONS, sectionInfo, type Feature, type FeatureSection } from "@/lib/features";
import { formatDate, projectHref } from "@/lib/projects";

type Tab = "all" | FeatureSection;

const TABS: readonly { id: Tab; label: string }[] = [{ id: "all", label: "All" }, ...FEATURE_SECTIONS.map((s) => ({ id: s.id, label: s.label }))];

const PAGE = 30;

/**
 * Discover projects: the same tab bar as Discover (with the sections as tabs),
 * the newest story large, then a grid of the rest; or a compact list.
 */
export function StoriesDirectory({ features, initial = "all" }: { features: Feature[]; initial?: Tab }) {
  const [tab, setTab] = useState<Tab>(initial);
  const [view, setView] = useDirectoryView("identify-discover-projects-view");
  const [shown, setShown] = useState(PAGE);

  const results = useMemo(() => features.filter((f) => tab === "all" || f.feature_section === tab), [features, tab]);
  const [lead, ...others] = results;
  const visible = others.slice(0, shown);

  return (
    <section>
      <DirectoryTabs
        label="Sections"
        tabs={TABS}
        active={tab}
        onSelect={(id) => {
          setTab(id);
          setShown(PAGE);
        }}
        view={view}
        onView={setView}
      />

      {!lead ? (
        <p className="py-12 text-center text-muted">No stories here yet. We&apos;re out looking for great work.</p>
      ) : view === "list" ? (
        <ul className="mt-6 divide-y divide-line">
          {[lead, ...visible].map((f) => {
            const about = f.subject ? f.subject.member?.full_name || f.subject.name : null;
            return (
              <li key={f.id} className="flex items-baseline gap-3 py-3">
                <Link href={projectHref(f.author.username, f.slug)} className="flex min-w-0 flex-1 items-baseline gap-3 hover:[&>span:first-child]:underline">
                  <span className="shrink-0 font-medium">{f.title}</span>
                  <span className="truncate text-muted">{about ? `About ${about}` : f.summary}</span>
                </Link>
                <span className="hidden shrink-0 text-xs text-muted sm:inline">{sectionInfo(f.feature_section).label}</span>
                <span className="w-24 shrink-0 text-right text-xs text-muted tabular-nums">{formatDate(f.published_at)}</span>
              </li>
            );
          })}
        </ul>
      ) : (
        <>
          <div className="mt-6">
            <FeatureHero feature={lead} priority />
          </div>
          {visible.length > 0 && (
            <div className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((f) => (
                <FeatureCard key={f.id} feature={f} />
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
