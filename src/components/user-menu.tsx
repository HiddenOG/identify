"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
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

const PHONE = "(max-width: 639px)";

/**
 * The account menu behind the header avatar. On phones it's a full-screen sheet, like Medium's
 * app (in a portal, since the header's backdrop blur would trap a fixed element); on wider screens
 * it's a dropdown.
 */
export function UserMenu({ username, name, avatarUrl, email, openToWork, admin }: Props) {
  const sheet = useRef<HTMLDivElement>(null);
  const { open, setOpen, root } = usePopover<HTMLDivElement>(sheet);
  const [phone, setPhone] = useState(false);

  useEffect(() => {
    const media = matchMedia(PHONE);
    const update = () => setPhone(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  // The page behind a full-screen sheet shouldn't scroll.
  useEffect(() => {
    if (!open || !phone) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, phone]);

  const content = (
    <MenuContent username={username} name={name} avatarUrl={avatarUrl} email={email} openToWork={openToWork} admin={admin} large={phone} />
  );

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

      {open &&
        (phone ? (
          createPortal(
            <div ref={sheet} role="menu" aria-label="Account" className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-background">
              <div className="flex h-14 shrink-0 items-center justify-between border-b border-line px-4">
                <span className="font-semibold">Account</span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Close menu"
                  className="grid size-10 place-items-center rounded-full text-muted hover:bg-surface hover:text-foreground"
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
              {content}
            </div>,
            document.body,
          )
        ) : (
          <div
            role="menu"
            className="absolute right-0 z-50 mt-3 w-72 overflow-hidden rounded-lg border border-line bg-background shadow-[0_8px_30px_rgb(0_0_0/0.18)]"
          >
            {content}
          </div>
        ))}
    </div>
  );
}

/** What's in the menu; `large` spaces it out for the full-screen phone sheet. */
function MenuContent({ username, name, avatarUrl, email, openToWork, admin, large }: Props & { large: boolean }) {
  const pad = large ? "px-6" : "px-5";
  return (
    <>
      {username ? (
        <Link href={`/${username}`} role="menuitem" className={`flex items-center gap-4 ${pad} ${large ? "py-6" : "py-5"} hover:bg-surface`}>
          <AuthorAvatar name={name} url={avatarUrl} size={large ? 56 : 48} />
          <span className="min-w-0">
            <span className={`block truncate font-medium ${large ? "text-lg" : ""}`}>{name}</span>
            <span className="block text-sm text-muted">View profile</span>
          </span>
        </Link>
      ) : (
        <Link href="/onboarding" role="menuitem" className={`block ${pad} py-5 font-medium hover:bg-surface`}>
          Finish setting up your profile →
        </Link>
      )}

      {/* Only what the sidebar and header don't already offer. */}
      <div className={large ? "border-t border-line py-3" : "pb-3"}>
        <div className={`flex items-center gap-4 ${pad} pt-2.5 pb-2 text-muted`}>
          <SunMoonIcon className="shrink-0" />
          <span className={large ? "text-base" : "text-sm"}>Appearance</span>
        </div>
        <div className={`pb-2 ${large ? "pl-16" : "pl-15"}`}>
          <AppearancePicker />
        </div>
        {username && (
          <>
            <MenuLink href="/settings" icon={<SettingsIcon />} large={large}>
              Settings
            </MenuLink>
            <MenuLink href="/settings/cv" icon={<DocIcon />} sub={openToWork ? "Open to work" : undefined} large={large}>
              Edit CV
            </MenuLink>
            {admin && (
              <MenuLink href="/admin/discover" icon={<CompassIcon />} large={large}>
                Discover admin
              </MenuLink>
            )}
          </>
        )}
      </div>

      <form action="/auth/signout" method="post" className="border-t border-line">
        <button role="menuitem" className={`block w-full ${pad} ${large ? "py-5" : "py-4"} text-left hover:bg-surface`}>
          <span className={`block ${large ? "text-base" : "text-sm"}`}>Sign out</span>
          {email && <span className="block text-xs text-muted">{maskEmail(email)}</span>}
        </button>
      </form>

      <nav className={`flex flex-wrap gap-x-3 gap-y-1 border-t border-line ${pad} py-4 text-xs text-muted ${large ? "mt-auto gap-x-4 pb-8 text-sm" : ""}`}>
        {FOOTER_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="hover:text-foreground">
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}

function MenuLink({ href, icon, sub, large, children }: { href: string; icon: ReactNode; sub?: string; large: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      role="menuitem"
      className={`flex items-center gap-4 ${large ? "px-6 py-3.5 text-base text-foreground" : "px-5 py-2.5 text-sm text-muted"} hover:text-foreground`}
    >
      <span className="shrink-0 text-muted">{icon}</span>
      <span>
        {children}
        {sub && <span className="block text-xs text-muted">{sub}</span>}
      </span>
    </Link>
  );
}
