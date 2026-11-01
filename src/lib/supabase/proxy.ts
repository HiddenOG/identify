import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv, supabaseKey, supabaseUrl } from "./env";

/** Routes that need a signed-in user. */
const PROTECTED_PREFIXES = ["/onboarding", "/settings", "/new", "/notifications", "/following", "/library", "/stories", "/stats", "/messages", "/admin", "/discover/suggest"];

/** Renew the session this long before it expires, to absorb client/server clock drift. */
const EARLY_REFRESH_MS = 2 * 60 * 1000;

/** Refreshes the auth session cookie on every request and guards protected routes. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (!hasSupabaseEnv) return response;

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Do not run code between createServerClient and getClaims(): it refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  // getClaims() only refreshes a token this machine's clock says has expired. If the clock runs
  // behind Supabase's, the database rejects the token first ("JWT expired"), so renew early.
  const expiresAt = data?.claims?.exp;
  if (expiresAt && expiresAt * 1000 - Date.now() < EARLY_REFRESH_MS) {
    const { error } = await supabase.auth.refreshSession();
    if (error) console.error("[proxy.refreshSession]", error.message);
  }

  const { pathname } = request.nextUrl;
  // Match whole path segments, so a user named "newton" isn't caught by "/new".
  if (!signedIn && PROTECTED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
