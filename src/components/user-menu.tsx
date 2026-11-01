"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { AuthorAvatar } from "@/components/author-avatar";
import { usePopover } from "@/components/use-popover";
import { CompassIcon, DocIcon, SettingsIcon, SunMoonIcon } from "@/components/icons";
import { AppearancePicker } from "@/components/theme";
import { FOOTER_LINKS } from "@/lib/site";

type Props = {
  username: string | null;
  name: string;
  avatarUrl: string | null;
  email: string | null;
  openToWork: boolean;
  /** Shows the Discover admin link. */
  admin?: boolean;
};

/** "go••••••@gmail.com", like Medium's account menu. */
function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}${"•".repeat(Math.max(3, Math.min(local.length - 2, 10)))}@${domain}`;
}

export function UserMenu({ username, name, avatarUrl, email, openToWork, admin }: Props) {
  const { open, setOpen, root } = usePopover<HTMLDivElement>();

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
        className="relative block rounded-full ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-foreground"
      >
        <AuthorAvatar name={name} url={avatarUrl} size={32} />
        {openToWork && (
          <span className="absolute -right-0.5 -bottom-0.5 size-3 rounded-full border-2 border-background bg-brand" title="Open to work" />
        )}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-3 w-72 overflow-hidden rounded-lg border border-line bg-background shadow-[0_8px_30px_rgb(0_0_0/0.18)]"
        >
          {username ? (
            <Link href={`/${username}`} role="menuitem" className="flex items-center gap-3 px-5 py-5 hover:bg-surface">
              <AuthorAvatar name={name} url={avatarUrl} size={48} />
              <span className="min-w-0">
                <span className="block truncate font-medium">{name}</span>
                <span className="block text-sm text-muted">View profile</span>
              </span>
            </Link>
          ) : (
            <Link href="/onboarding" role="menuitem" className="block px-5 py-5 font-medium hover:bg-surface">
              Finish setting up your profile →
            </Link>
          )}

          {/* Only what the sidebar and header don't already offer. */}
          <div className="pb-3">
            <div className="flex items-center gap-4 px-5 pt-2.5 pb-2 text-muted">
              <SunMoonIcon className="shrink-0" />
              <span className="text-sm">Appearance</span>
            </div>
            <div className="pb-2 pl-15">
              <AppearancePicker />
            </div>
            {username && (
              <>
                <MenuLink href="/settings" icon={<SettingsIcon />}>
                  Settings
                </MenuLink>
                <MenuLink href="/settings/cv" icon={<DocIcon />} sub={openToWork ? "Open to work" : undefined}>
                  Edit CV
                </MenuLink>
                {admin && (
                  <MenuLink href="/admin/discover" icon={<CompassIcon />}>
                    Discover admin
                  </MenuLink>
                )}
              </>
            )}
          </div>

          <form action="/auth/signout" method="post" className="border-t border-line">
            <button role="menuitem" className="block w-full px-5 py-4 text-left hover:bg-surface">
              <span className="block text-sm">Sign out</span>
              {email && <span className="block text-xs text-muted">{maskEmail(email)}</span>}
            </button>
          </form>

          <nav className="flex flex-wrap gap-x-3 gap-y-1 border-t border-line px-5 py-4 text-xs text-muted">
            {FOOTER_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="hover:text-foreground">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  );
}

function MenuLink({ href, icon, sub, children }: { href: string; icon: ReactNode; sub?: string; children: ReactNode }) {
  return (
    <Link href={href} role="menuitem" className="flex items-center gap-4 px-5 py-2.5 text-sm text-muted hover:text-foreground">
      <span className="shrink-0">{icon}</span>
      <span>
        {children}
        {sub && <span className="block text-xs">{sub}</span>}
      </span>
    </Link>
  );
}
