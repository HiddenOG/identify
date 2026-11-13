"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export type DirectoryView = "list" | "grid";

/**
 * The tab bar Discover and Discover projects share: segmented tabs, an optional link-tab to the
 * sister page at the end, and the list/grid switch. Scrolls sideways on phones.
 */
export function DirectoryTabs<T extends string>({
  tabs,
  active,
  onSelect,
  link,
  view,
  onView,
  label,
}: {
  tabs: readonly { id: T; label: string }[];
  active: T;
  onSelect: (id: T) => void;
  link?: { href: string; label: string };
  view: DirectoryView;
  onView: (view: DirectoryView) => void;
  label: string;
}) {
  const tab = "flex-1 shrink-0 rounded-lg px-4 py-2 text-center text-sm whitespace-nowrap";
  return (
    <div className="flex gap-2">
      <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto rounded-xl bg-surface p-1" role="tablist" aria-label={label}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            onClick={() => onSelect(t.id)}
            className={`${tab} ${active === t.id ? "bg-background font-medium text-foreground shadow-sm" : "text-muted hover:text-foreground"}`}
          >
            {t.label}
          </button>
        ))}
        {link && (
          <Link href={link.href} className={`${tab} text-muted hover:text-foreground`}>
            {link.label}
          </Link>
        )}
      </div>
      <div className="flex shrink-0 gap-1 rounded-xl bg-surface p-1" role="group" aria-label="View">
        {(["grid", "list"] as const).map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => onView(v)}
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
  );
}

/** Grid by default; remembers a switch to list on this device (storage may be blocked). */
export function useDirectoryView(key: string) {
  const [view, setView] = useState<DirectoryView>("grid");
  useEffect(() => {
    try {
      const saved = localStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reading the saved choice once after mount
      if (saved === "grid" || saved === "list") setView(saved);
    } catch {}
  }, [key]);
  function choose(next: DirectoryView) {
    setView(next);
    try {
      localStorage.setItem(key, next);
    } catch {}
  }
  return [view, choose] as const;
}
