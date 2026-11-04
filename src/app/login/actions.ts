"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { onboardingHref, safeNext } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

const credentials = z.object({
  email: z.email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

async function origin() {
  const h = await headers();
  return h.get("origin") ?? `https://${h.get("host")}`;
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { error: error.message };

  redirect(safeNext(formData.get("next")));
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Where they were heading (e.g. claiming a Discover listing); onboarding sends them on there.
  const next = safeNext(formData.get("next"));
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    ...parsed.data,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: error.message };

  // Supabase answers a sign-up for an email that's already registered with a stand-in user that has
  // no identities (and sends no email), so it doesn't reveal which emails exist. Treat it as a sign-in.
  if (data.user && data.user.identities?.length === 0) {
    const { error: signInError } = await supabase.auth.signInWithPassword(parsed.data);
    if (signInError) return { error: "You already have an account with this email. Sign in instead." };
    redirect(next);
  }

  // A genuinely new account: with email confirmation on, there is no session until the link is clicked.
  if (!data.session) return { message: "Check your email for a confirmation link." };
  redirect(onboardingHref(next));
}

const OAUTH_PROVIDERS = { google: "Google", github: "GitHub" } as const;
type OAuthProvider = keyof typeof OAUTH_PROVIDERS;

/** "Continue with Google / GitHub": hands off to the provider, which returns to /auth/callback. */
export async function signInWithProvider(formData: FormData) {
  const raw = formData.get("provider");
  const provider: OAuthProvider = raw === "google" ? "google" : "github";
  const supabase = await createClient();
  const next = safeNext(formData.get("next"));
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`,
      // Always let people pick which Google account to use.
      ...(provider === "google" ? { queryParams: { prompt: "select_account" } } : {}),
    },
  });
  if (error || !data.url) {
    redirect(`/login?error=${encodeURIComponent(error?.message ?? `${OAUTH_PROVIDERS[provider]} sign-in failed`)}`);
  }
  redirect(data.url);
}

/** "Forgot password?": emails a reset link. Says the same thing either way, so it doesn't reveal who has an account. */
export async function requestPasswordReset(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = credentials.pick({ email: true }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await origin()}/auth/callback?next=/reset-password`,
  });
  // Too many requests is worth saying; anything else would hint whether the account exists.
  if (error?.status === 429) return { error: "Too many requests. Wait a minute and try again." };
  if (error) console.error("[requestPasswordReset]", error.message);
  return { message: "If there's an account for that email, a reset link is on its way. Check your inbox (and spam)." };
}

const newPassword = z
  .object({ password: credentials.shape.password, confirm: z.string() })
  .refine((v) => v.password === v.confirm, { message: "The passwords don't match.", path: ["confirm"] });

/** Sets the new password for someone who arrived through a reset link (they're signed in by then). */
export async function setNewPassword(_: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = newPassword.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) return { error: "That reset link has expired. Request a new one." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.code === "same_password" ? "That's your current password. Pick a new one." : error.message };
  redirect("/?password=updated");
}
