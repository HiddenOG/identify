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

/** /onboarding, carrying the page to return to afterwards. */
export function onboardingHref(next: string) {
  return next === "/" ? "/onboarding" : `/onboarding?next=${encodeURIComponent(next)}`;
}
