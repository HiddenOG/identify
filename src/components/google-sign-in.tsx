"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { onboardingHref } from "@/lib/next-path";
import { GOOGLE_CLIENT_ID } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";

type CredentialResponse = { credential: string };
type GoogleId = {
  initialize(config: Record<string, unknown>): void;
  renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
};
declare global {
  interface Window {
    google?: { accounts: { id: GoogleId } };
  }
}

const SCRIPT = "https://accounts.google.com/gsi/client";

function loadScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT}"]`);
    const script = existing ?? Object.assign(document.createElement("script"), { src: SCRIPT, async: true });
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => reject(new Error("Google sign-in didn't load")));
    if (!existing) document.head.appendChild(script);
  });
}

async function sha256Hex(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Google's own "Continue with Google" button, signing in on identify.com.im itself, so Google's
 * screen names our site rather than the Supabase project address. Google hands back an ID token,
 * which Supabase turns into a session (signInWithIdToken). The nonce ties that token to this page.
 * If Google's script can't load (blocked, offline), `fallback` (the redirect-based button) shows.
 */
export function GoogleSignIn({ next, fallback }: { next: string; fallback: ReactNode }) {
  const holder = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(!GOOGLE_CLIENT_ID);
  const [error, setError] = useState("");
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;
    (async () => {
      try {
        await loadScript();
        const nonce = crypto.randomUUID();
        const hashed = await sha256Hex(nonce);
        if (cancelled || !holder.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          nonce: hashed,
          use_fedcm_for_button: true,
          callback: async ({ credential }: CredentialResponse) => {
            setError("");
            setSigningIn(true);
            const supabase = createClient();
            const { data, error } = await supabase.auth.signInWithIdToken({ provider: "google", token: credential, nonce });
            if (error || !data.user) {
              setSigningIn(false);
              return setError(error?.message ?? "Google sign-in failed. Try again.");
            }
            // First visit: pick a username first (same as the email and redirect sign-ins).
            const { data: profile } = await supabase.from("profiles").select("username").eq("id", data.user.id).maybeSingle();
            window.location.assign(profile?.username ? next : onboardingHref(next));
          },
        });
        const dark = document.documentElement.dataset.theme === "dark" || (!document.documentElement.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
        window.google.accounts.id.renderButton(holder.current, {
          type: "standard",
          theme: dark ? "filled_black" : "outline",
          size: "large",
          shape: "pill",
          text: "continue_with",
          logo_alignment: "center",
          width: Math.min(400, holder.current.offsetWidth || 400),
        });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [next]);

  if (failed) return <>{fallback}</>;
  return (
    <div>
      <div ref={holder} className={`flex min-h-11 justify-center ${signingIn ? "pointer-events-none opacity-60" : ""}`} />
      {signingIn && <p className="mt-2 text-center text-sm text-muted">Signing you in…</p>}
      {error && <p className="mt-2 text-center text-sm text-danger">{error}</p>}
    </div>
  );
}
