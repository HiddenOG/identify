"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { AuthorAvatar } from "@/components/author-avatar";
import { BookmarkIcon, HomeIcon, PeopleIcon, SearchIcon, WriteIcon } from "@/components/icons";

type Props = { username: string; name: string; avatarUrl: string | null };

// Writing and chatting need the whole screen (and their own bottom bars).
const HIDDEN_ON = [/^\/new$/, /\/edit$/, /^\/messages(\/|$)/, /^\/settings(\/|$)/];
// Where the floating compose button appears, like Medium's green pencil.
const COMPOSE_ON = ["/", "/following", "/stories", "/library", "/search", "/topics", "/people"];

/** Phone-only bottom navigation for signed-in people (Medium app style). Render inside <Suspense>. */
export function MobileTabBar({ username, name, avatarUrl }: Props) {
  const pathname = usePathname();
  if (HIDDEN_ON.some((re) => re.test(pathname))) return null;

  const tabs = [
    { href: "/", label: "Home", icon: HomeIcon, active: pathname === "/" },
    { href: "/following", label: "Following", icon: PeopleIcon, active: pathname === "/following" },
    { href: "/search", label: "Search", icon: SearchIcon, active: pathname === "/search" || pathname === "/topics" || pathname.startsWith("/tags/") },
    { href: "/library", label: "Library", icon: BookmarkIcon, active: pathname === "/library" },
  ];
  const profileActive = pathname === `/${username}` || pathname === "/stories" || pathname === "/stats";

  return (
    <>
      {/* Keeps the last bit of each page from hiding behind the bar. */}
      <div aria-hidden className="h-16 md:hidden print:hidden" />

      {COMPOSE_ON.includes(pathname) && (
        <Link
          href="/new"
          aria-label="Write a story"
          className="fixed right-4 bottom-20 z-40 grid size-14 place-items-center rounded-full bg-success text-background shadow-lg md:hidden print:hidden"
        >
          <WriteIcon />
        </Link>
      )}

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-line bg-background pb-[env(safe-area-inset-bottom)] md:hidden print:hidden"
      >
        {tabs.map(({ href, label, icon: Icon, active }) => (
          <Link
            key={href}
            href={href}
            aria-label={label}
            aria-current={active ? "page" : undefined}
            className={`grid size-12 place-items-center ${active ? "text-foreground" : "text-muted"}`}
          >
            <Icon strokeWidth={active ? 2 : 1.4} />
          </Link>
        ))}
        <Link
          href={`/${username}`}
          aria-label="Your profile"
          aria-current={profileActive ? "page" : undefined}
          className={`grid size-12 place-items-center rounded-full ${profileActive ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : ""}`}
        >
          <AuthorAvatar name={name} url={avatarUrl} size={28} />
        </Link>
      </nav>
    </>
  );
}
