import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { nextFromRedirect, onboardingHref } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["signup", "recovery", "email_change", "email", "magiclink", "invite"];

/**
 * Where links in our emails land (see supabase/templates). Unlike /auth/callback, which needs the
 * browser that started sign-in, a token hash works on any device: sign up on a laptop, confirm on
 * a phone.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = nextFromRedirect(searchParams.get("next"));

  if (!tokenHash || !type || !TYPES.includes(type)) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("That link is incomplete. Request a new one.")}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error || !data.user) {
    const message =
      type === "recovery"
        ? "That reset link has expired or was already used. Request a new one."
        : "That link has expired or was already used. Sign in, or request a new one.";
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(message)}`);
  }

  if (type === "recovery") return NextResponse.redirect(`${origin}/reset-password`);
  if (type === "email_change") return NextResponse.redirect(`${origin}/settings?email=changed`);

  // Signed in now. First visit: pick a username, then carry on to wherever they were heading.
  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", data.user.id)
    .maybeSingle<{ username: string | null }>();
  return NextResponse.redirect(`${origin}${profile?.username ? next : onboardingHref(next)}`);
}
