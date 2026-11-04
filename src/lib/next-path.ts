/**
 * Where to send someone after sign-in, sign-up or onboarding. Only same-site paths (no "//evil.com"),
 * and never back into onboarding itself.
 */
export function safeNext(value: unknown, fallback = "/") {
  const next = typeof value === "string" ? value : "";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (next === "/onboarding" || next.startsWith("/onboarding?")) return fallback;
  return next;
}

/**
 * The page to land on after an email link. Supabase's `{{ .RedirectTo }}` is a full URL, usually our
 * own `/auth/callback?next=…`, so unwrap that; only the path is kept, never another site.
 */
export function nextFromRedirect(value: string | null) {
  if (!value || !/^https?:\/\//.test(value)) return safeNext(value);
  try {
    const url = new URL(value);
    if (url.pathname === "/auth/callback") return safeNext(url.searchParams.get("next"));
    return safeNext(url.pathname + url.search);
  } catch {
    return "/";
  }
}

/** /onboarding, carrying the page to return to afterwards. */
export function onboardingHref(next: string) {
  return next === "/" ? "/onboarding" : `/onboarding?next=${encodeURIComponent(next)}`;
}
