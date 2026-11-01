import { Suspense } from "react";
import Link from "next/link";
import { HeaderSearch } from "@/components/header-search";
import { MessageIcon, WriteIcon } from "@/components/icons";
import { NotificationsMenu } from "@/components/notifications-menu";
import { AuthMark, SidebarToggle } from "@/components/sidebar";
import { UserMenu } from "@/components/user-menu";
import { isAdmin } from "@/lib/discover/portfolios";
import { getUnreadMessageCount } from "@/lib/messages";
import { getUnreadCount } from "@/lib/notifications";
import { getCurrentUser } from "@/lib/profiles";
import { SITE_NAME } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/95 backdrop-blur print:hidden">
      {/* Signed out, the header lines up with the page column (like Medium's landing); signed in it spans the window. */}
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 signed-out:mx-auto signed-out:max-w-6xl">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
          <SidebarToggle />
          <Link href="/" className="font-serif text-[1.65rem] font-bold tracking-tight">
            {SITE_NAME}
          </Link>
          <HeaderSearch />
        </div>

        {/* The logo prerenders; only the session-dependent nav streams in. */}
        <nav className="flex items-center gap-4 text-sm sm:gap-6">
          <Link href="/people" className="hidden text-muted hover:text-foreground sm:inline">
            People
          </Link>
          <Suspense fallback={<span className="h-8 w-32" />}>
            <HeaderUser />
          </Suspense>
        </nav>
      </div>
    </header>
  );
}

async function HeaderUser() {
  const supabase = hasSupabaseEnv ? await createClient() : null;
  const { profile, email } = supabase ? await getCurrentUser(supabase) : { profile: null, email: null };
  const [unread, unreadMessages, admin] =
    supabase && profile?.username
      ? await Promise.all([getUnreadCount(supabase, profile.id), getUnreadMessageCount(supabase, profile.id), isAdmin(supabase)])
      : [0, 0, false];

  if (!profile) {
    return (
      <>
        <AuthMark signedIn={false} />
        <Link href="/login?next=/new" className="hidden items-center gap-2 text-muted hover:text-foreground sm:flex">
          <WriteIcon /> Write
        </Link>
        <Link href="/login" className="text-muted hover:text-foreground">
          Sign in
        </Link>
        <Link href="/login?mode=signup" className="rounded-full bg-foreground px-4 py-2 text-background hover:opacity-90">
          Get started
        </Link>
      </>
    );
  }

  return (
    <>
      <AuthMark signedIn />
      {/* Phones get the floating ✎ button and the Search tab instead. */}
      <Link href="/new" className="hidden items-center gap-2 text-muted hover:text-foreground md:flex">
        <WriteIcon /> Write
      </Link>
      {profile.username && (
        <Link
          href="/messages"
          aria-label={unreadMessages ? `Messages (${unreadMessages} unread)` : "Messages"}
          className="relative text-muted hover:text-foreground"
        >
          <MessageIcon />
          {unreadMessages > 0 && (
            <span className="absolute -top-1.5 -right-2 min-w-4 rounded-full bg-brand px-1 text-center text-[10px] leading-4 font-semibold text-brand-ink">
              {unreadMessages > 99 ? "99+" : unreadMessages}
            </span>
          )}
        </Link>
      )}
      {profile.username && <NotificationsMenu unread={unread} />}
      <UserMenu
        username={profile.username}
        name={profile.full_name || profile.username || "?"}
        avatarUrl={profile.avatar_url}
        email={email}
        openToWork={profile.open_to_work}
        admin={admin}
      />
    </>
  );
}
