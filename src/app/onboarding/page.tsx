import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SetupNotice } from "@/components/setup-notice";
import { cookies } from "next/headers";
import { CLAIM_COOKIE, getCurrentUser, USERNAME_PATTERN } from "@/lib/profiles";
import { onboardingHref, safeNext } from "@/lib/next-path";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";
import { suggestUsername } from "@/lib/discover/host";
import { getPortfolio } from "@/lib/discover/portfolios";

export const metadata: Metadata = { title: "Set up your page", robots: { index: false } };

export default function OnboardingPage({ searchParams }: PageProps<"/onboarding">) {
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="mb-2 font-serif text-3xl font-bold">Claim your page</h1>
      <p className="mb-8 text-muted">Pick a username. You can fill in your CV next.</p>
      <Suspense>
        <OnboardingContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function OnboardingContent({ searchParams }: Pick<PageProps<"/onboarding">, "searchParams">) {
  if (!hasSupabaseEnv) return <SetupNotice />;
  // Where they were heading before signing up (e.g. claiming a Discover listing).
  const next = safeNext((await searchParams).next);
  const supabase = await createClient();
  const { userId, profile } = await getCurrentUser(supabase);
  if (!userId) redirect(`/login?next=${encodeURIComponent(onboardingHref(next))}`);
  if (profile?.username) redirect(next === "/" ? `/${profile.username}` : next);

  // The name a visitor typed into "Claim your page" on the home page, if any.
  const claimed = (await cookies()).get(CLAIM_COOKIE)?.value ?? "";
  // Coming from a Discover claim link: suggest their name and a username from the listing.
  const listingId = next.match(/^\/discover\/claim\/([0-9a-f-]{36})/i)?.[1];
  const listing = listingId ? await getPortfolio(supabase, listingId) : null;
  const suggested = listing ? suggestUsername(listing.name) : "";
  return (
    <OnboardingForm
      defaultName={profile?.full_name || listing?.name || ""}
      defaultUsername={USERNAME_PATTERN.test(claimed) ? claimed : USERNAME_PATTERN.test(suggested) ? suggested : ""}
      next={next}
    />
  );
}
