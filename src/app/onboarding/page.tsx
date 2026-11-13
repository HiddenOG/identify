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
  const { userId, profile } = await getCurrentUser(await createClient());
  if (!userId) redirect(`/login?next=${encodeURIComponent(onboardingHref(next))}`);
  if (profile?.username) redirect(next === "/" ? `/${profile.username}` : next);

  // The name a visitor typed into "Claim your page" on the home page, if any.
  const claimed = (await cookies()).get(CLAIM_COOKIE)?.value ?? "";
  return (
    <OnboardingForm
      defaultName={profile?.full_name ?? ""}
      defaultUsername={USERNAME_PATTERN.test(claimed) ? claimed : ""}
      next={next}
    />
  );
}
