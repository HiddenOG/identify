"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { CLAIM_COOKIE, RESERVED_USERNAMES, USERNAME_PATTERN } from "@/lib/profiles";
import { SITE_NAME } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";
import { hasSupabaseEnv } from "@/lib/supabase/env";

/**
 * "Claim your page": checks the username is valid and free, remembers it in a short-lived cookie
 * (onboarding pre-fills it, even after an email confirmation round-trip), then goes to sign-up.
 */
export function ClaimForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);
  const username = name.trim().toLowerCase();

  async function claim(e: FormEvent) {
    e.preventDefault();
    if (!USERNAME_PATTERN.test(username)) return setError("Use 3–30 lowercase letters, numbers, - or _.");
    if (RESERVED_USERNAMES.has(username)) return setError("That name is reserved. Try another.");

    if (hasSupabaseEnv) {
      setChecking(true);
      const { data } = await createClient().from("profiles").select("id").eq("username", username).maybeSingle();
      setChecking(false);
      if (data) return setError(`${SITE_NAME.toLowerCase()}/${username} is taken. Try another.`);
    }

    document.cookie = `${CLAIM_COOKIE}=${username}; path=/; max-age=${60 * 60 * 24}; samesite=lax`;
    router.push("/login?mode=signup&next=/onboarding");
  }

  return (
    <form onSubmit={claim} className="max-w-xl">
      <div className="flex flex-wrap items-center gap-2 rounded-full border border-foreground bg-background p-1.5 pl-5 sm:flex-nowrap">
        <label htmlFor="claim" className="shrink-0 text-lg text-muted">
          {SITE_NAME.toLowerCase()}/
        </label>
        <input
          id="claim"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setError("");
          }}
          placeholder="your-name"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent py-2 text-lg outline-none placeholder:text-muted/60"
        />
        <button
          disabled={checking}
          className="shrink-0 rounded-full bg-foreground px-6 py-2.5 text-background hover:opacity-90 disabled:opacity-60"
        >
          {checking ? "Checking…" : "Claim it"}
        </button>
      </div>
      {error && (
        <p className="mt-2 pl-5 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
