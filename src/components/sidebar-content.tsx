import Link from "next/link";
import { AuthorAvatar } from "@/components/author-avatar";
import { PeopleIcon } from "@/components/icons";
import { NavList, SidebarNav, type SidebarItem } from "@/components/sidebar-nav";
import { getFollowedPeople } from "@/lib/follows";
import { getCurrentUser } from "@/lib/profiles";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

const SIGNED_OUT: SidebarItem[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/discover", label: "Discover", icon: "discover" },
  { href: "/people", label: "People", icon: "people" },
];

const FOLLOWING_SHOWN = 12;
const NEW_POST_DAYS = 7;

/** Shown while the signed-in parts load. */
export function SidebarFallback() {
  return <NavList items={SIGNED_OUT} />;
}

export async function SidebarContent() {
  const supabase = hasSupabaseEnv ? await createClient() : null;
  const { userId, profile } = supabase ? await getCurrentUser(supabase) : { userId: null, profile: null };

  if (!supabase || !userId || !profile?.username) {
    return (
      <>
        <SidebarNav items={SIGNED_OUT} />
        <p className="border-t border-line mx-6 pt-6 text-sm text-muted">
          <Link href="/login" className="text-foreground underline">
            Sign in
          </Link>{" "}
          to follow builders and save projects.
        </p>
      </>
    );
  }

  const items: SidebarItem[] = [
    { href: "/", label: "Home", icon: "home" },
    { href: "/discover", label: "Discover", icon: "discover" },
    { href: "/library", label: "Library", icon: "library" },
    { href: "/messages", label: "Messages", icon: "messages" },
    { href: `/${profile.username}`, label: "Profile", icon: "profile" },
    { href: "/stories", label: "Stories", icon: "stories" },
    { href: "/stats", label: "Stats", icon: "stats" },
  ];

  const following = await getFollowedPeople(supabase, userId, NEW_POST_DAYS);

  return (
    <>
      <SidebarNav items={items} />
      <div className="mx-4 border-t border-line pt-6 pb-8">
        <Link href="/following" className="mb-3 flex items-center gap-4 px-2 py-1 text-muted hover:text-foreground">
          <PeopleIcon />
          Following
        </Link>
        {following.length === 0 ? (
          <p className="px-2 text-sm text-muted">
            Follow builders to see them here.{" "}
            <Link href="/people" className="text-foreground underline">
              Find people
            </Link>
          </p>
        ) : (
          <ul className="space-y-1">
            {following.slice(0, FOLLOWING_SHOWN).map((p) => (
              <li key={p.id}>
                <Link href={`/${p.username}`} className="flex items-center gap-3 rounded-md px-2 py-1.5 text-sm text-muted hover:text-foreground">
                  <AuthorAvatar name={p.full_name || p.username} url={p.avatar_url} size={22} />
                  <span className="min-w-0 flex-1 truncate">{p.full_name || p.username}</span>
                  {p.postedRecently && (
                    <span className="size-1.5 shrink-0 rounded-full bg-success" title="Posted this week" />
                  )}
                </Link>
              </li>
            ))}
            {following.length > FOLLOWING_SHOWN && (
              <li>
                <Link href="/following" className="block px-2 py-1.5 text-sm text-muted hover:text-foreground">
                  See all ({following.length})
                </Link>
              </li>
            )}
          </ul>
        )}
      </div>
    </>
  );
}
