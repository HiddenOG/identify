import { NextResponse } from "next/server";
import { onboardingHref, safeNext } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/server";

/** Landing point for OAuth and email-confirmation links: trades the code for a session. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (!code) return NextResponse.redirect(`${origin}/login?error=Missing+sign-in+code`);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);

  // First visit: send them to pick a username.
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", data.user.id)
    .maybeSingle<{ username: string | null }>();

  return NextResponse.redirect(`${origin}${profile?.username ? next : onboardingHref(next)}`);
}
