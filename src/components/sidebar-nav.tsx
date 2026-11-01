"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookmarkIcon, CompassIcon, DocIcon, HomeIcon, MessageIcon, PeopleIcon, StatsIcon, UserIcon } from "@/components/icons";

const ICONS = { home: HomeIcon, discover: CompassIcon, library: BookmarkIcon, profile: UserIcon, stories: DocIcon, stats: StatsIcon, people: PeopleIcon, messages: MessageIcon };

export type SidebarItem = { href: string; label: string; icon: keyof typeof ICONS };

/** The link list itself; `active` is the current path (none while loading). */
export function NavList({ items, active }: { items: SidebarItem[]; active?: string }) {
  return (
    <nav className="px-4 py-6">
      <ul className="space-y-1">
        {items.map(({ href, label, icon }) => {
          const Icon = ICONS[icon];
          const current = active === href;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`flex items-center gap-4 rounded-md px-2 py-2.5 ${current ? "font-medium text-foreground" : "text-muted hover:text-foreground"}`}
              >
                <Icon />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Main sidebar links; the current page is shown in full ink like Medium. Render inside <Suspense>. */
export function SidebarNav({ items }: { items: SidebarItem[] }) {
  return <NavList items={items} active={usePathname()} />;
}
