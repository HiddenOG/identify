"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/settings", label: "Account" },
  { href: "/settings/cv", label: "CV & profile" },
];

function Tabs({ active }: { active?: string }) {
  return (
    <nav className="mt-10 flex gap-8 border-b border-line text-sm">
      {TABS.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          aria-current={active === t.href ? "page" : undefined}
          className={`-mb-px shrink-0 pb-4 ${active === t.href ? "border-b border-foreground" : "text-muted hover:text-foreground"}`}
        >
          {t.label}
        </Link>
      ))}
    </nav>
  );
}

/** Shown while the URL is read (it can't be during prerender). */
export function SettingsTabsFallback() {
  return <Tabs />;
}

export function SettingsTabs() {
  return <Tabs active={usePathname()} />;
}
