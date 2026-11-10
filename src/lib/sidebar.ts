/** The left sidebar's open/closed preference (desktop only), stored in localStorage. */
export const SIDEBAR_KEY = "bf-sidebar";

/**
 * Whether this browser was last seen signed in ("in"/"out"). A sign-in after "out" (or after
 * nothing) is a new session, which starts with the sidebar open even if it was closed before.
 */
export const AUTH_SEEN_KEY = "bf-auth-seen";

/** At lg+ these pages make room for the sidebar; everywhere else (CVs, project pages) it slides over. */
export const DOCKED_PATHS = ["/", "/following", "/library", "/stories", "/stats", "/notifications", "/people", "/search", "/topics"];
const DOCKED_PREFIXES = ["/tags/"];

export const DESKTOP_QUERY = "(min-width: 1024px)";

export function isDockedPath(pathname: string) {
  return DOCKED_PATHS.includes(pathname) || DOCKED_PREFIXES.some((p) => pathname.startsWith(p));
}

/**
 * The session cookie itself: "sb-<project>-auth-token" (or ".0", ".1" chunks). Must NOT match
 * "sb-<project>-auth-token-code-verifier", which an unfinished Google/GitHub/email sign-up leaves behind.
 */
const SESSION_COOKIE = /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/;

/**
 * Best guess before the server answers. Once the header has rendered, the server's verdict
 * (data-auth-verified, set by <AuthMark>) wins, so an expired or stale cookie can't fool it.
 */
export function hasSessionCookie() {
  const verified = document.documentElement.dataset.authVerified;
  if (verified) return verified === "in";
  return SESSION_COOKIE.test(document.cookie);
}

/**
 * Open by default on docked pages on desktop for signed-in people, unless they closed it.
 * Visitors get the full-width landing page; the ☰ button still opens it for them.
 */
export function shouldOpen(pathname: string, stored: string | null, desktop: boolean, signedIn: boolean) {
  return desktop && signedIn && isDockedPath(pathname) && stored !== "closed";
}

/**
 * Runs in <head> before the first paint so the layout doesn't jump. Sets data-docked (does this page
 * make room for the sidebar?) and data-sidebar (open/closed). Mirrors isDockedPath() and shouldOpen().
 */
export const SIDEBAR_SCRIPT = `(function(){try{var h=document.documentElement,p=location.pathname,a=${SESSION_COOKIE}.test(document.cookie),d=${JSON.stringify(DOCKED_PATHS)}.indexOf(p)>-1||${JSON.stringify(DOCKED_PREFIXES)}.some(function(x){return p.indexOf(x)===0}),s=localStorage.getItem("${SIDEBAR_KEY}");if(a&&localStorage.getItem("${AUTH_SEEN_KEY}")!=="in")s=null;h.setAttribute("data-docked",d?"true":"false");h.setAttribute("data-auth",a?"in":"out");h.setAttribute("data-landing",isLanding(p,a)?"true":"false");h.setAttribute("data-sidebar",d&&s!=="closed"&&a&&matchMedia("${DESKTOP_QUERY}").matches?"open":"closed")}catch(e){}function isLanding(p,a){return p==="/"&&!a}})()`;

/** The visitor landing page: the home page for someone who isn't signed in (no header search there). */
export function isLandingPage(pathname: string, signedIn: boolean) {
  return pathname === "/" && !signedIn;
}
