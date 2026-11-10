"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AUTH_SEEN_KEY, DESKTOP_QUERY, hasSessionCookie, isDockedPath, isLandingPage, shouldOpen, SIDEBAR_KEY } from "@/lib/sidebar";

// Open/closed and docked/undocked live on <html> (data-sidebar, data-docked) so CSS alone decides
// what is visible: the inline script in app/layout.tsx sets them before paint, SidebarSync on navigation.

function readStored() {
  try {
    return localStorage.getItem(SIDEBAR_KEY);
  } catch {
    return null;
  }
}

function setOpen(open: boolean) {
  document.documentElement.setAttribute("data-sidebar", open ? "open" : "closed");
}

/** The ☰ button in the header. On docked pages on desktop the choice is remembered. */
export function SidebarToggle() {
  return (
    <button
      type="button"
      aria-label="Toggle sidebar"
      onClick={() => {
        const open = document.documentElement.getAttribute("data-sidebar") !== "open";
        setOpen(open);
        if (isDockedPath(location.pathname) && matchMedia(DESKTOP_QUERY).matches) {
          try {
            localStorage.setItem(SIDEBAR_KEY, open ? "open" : "closed");
          } catch {
            // Storage blocked: the toggle still works for this page view.
          }
        }
      }}
      className="-ml-1 grid size-9 place-items-center rounded-full text-muted hover:text-foreground signed-out:hidden"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" aria-hidden>
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}

/**
 * Re-applies the attributes on client navigation (and after React's dev remount clears them).
 * Reads the URL, so it must render inside <Suspense>.
 */
export function SidebarSync() {
  const pathname = usePathname();
  useLayoutEffect(() => {
    const docked = isDockedPath(pathname);
    const signedIn = hasSessionCookie();
    document.documentElement.setAttribute("data-docked", docked ? "true" : "false");
    document.documentElement.setAttribute("data-auth", signedIn ? "in" : "out");
    document.documentElement.setAttribute("data-landing", isLandingPage(pathname, signedIn) ? "true" : "false");
    setOpen(shouldOpen(pathname, readStored(), matchMedia(DESKTOP_QUERY).matches, signedIn));
  }, [pathname]);
  return null;
}

// One slow, eased motion for every open/close so you can watch it slide.
const MOTION = "duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]";

/**
 * The server's answer to "is this person signed in?", rendered by the header. It corrects the
 * cookie-based guess the head script made (a stale or expired cookie can look like a session).
 */
export function AuthMark({ signedIn }: { signedIn: boolean }) {
  useLayoutEffect(() => {
    const html = document.documentElement;
    // A fresh sign-in: this browser was last seen signed out (or never seen). Remembered in storage,
    // because after a Google redirect or a client navigation the page may already say "in".
    let justSignedIn = false;
    try {
      justSignedIn = signedIn && localStorage.getItem(AUTH_SEEN_KEY) !== "in";
      localStorage.setItem(AUTH_SEEN_KEY, signedIn ? "in" : "out");
    } catch {
      // Storage blocked: the sidebar follows the usual default.
    }
    html.dataset.authVerified = signedIn ? "in" : "out";
    html.setAttribute("data-auth", signedIn ? "in" : "out");
    html.setAttribute("data-landing", isLandingPage(location.pathname, signedIn) ? "true" : "false");

    if (justSignedIn) {
      // Start every new session with the sidebar open; a later close is remembered as usual.
      try {
        localStorage.removeItem(SIDEBAR_KEY);
      } catch {
        // Storage blocked: it still opens below.
      }
    }
    setOpen(shouldOpen(location.pathname, readStored(), matchMedia(DESKTOP_QUERY).matches, signedIn));
  }, [signedIn]);
  return null;
}

/**
 * Docks beside feed-style pages on desktop; slides over everything else (and on phones).
 * Docked, it animates its width so the page eases aside while the panel slides in.
 * Visibility switches after the slide-out, so hidden links leave the tab order.
 */
export function SidebarShell({ children }: { children: ReactNode }) {
  return (
    <>
      {/* Tap outside to close whenever it slides over the page; fades rather than snapping. */}
      <div
        aria-hidden
        onClick={() => setOpen(false)}
        className={`pointer-events-none fixed inset-0 top-14 z-30 bg-black/30 opacity-0 transition-opacity ${MOTION} max-lg:sidebar-open:pointer-events-auto max-lg:sidebar-open:opacity-100 undocked:sidebar-open:pointer-events-auto undocked:sidebar-open:opacity-100 print:hidden`}
      />
      <aside
        aria-label="Sidebar"
        className={`invisible fixed top-14 bottom-0 left-0 z-30 w-60 -translate-x-full overflow-x-hidden overflow-y-auto overscroll-contain border-r border-line bg-background [scrollbar-width:thin] transition-[translate,width,visibility] ${MOTION} sidebar-open:visible sidebar-open:translate-x-0 print:hidden lg:docked:sticky lg:docked:bottom-auto lg:docked:h-[calc(100dvh-3.5rem)] lg:docked:shrink-0 lg:docked:translate-x-0 lg:docked:sidebar-closed:w-0 lg:docked:sidebar-closed:border-r-0 signed-out:hidden!`}
      >
        {/* Fixed width so the links don't rewrap while the docked panel narrows. */}
        <div className={`w-60 transition-[translate] ${MOTION} lg:docked:sidebar-closed:-translate-x-full`}>{children}</div>
      </aside>
    </>
  );
}
