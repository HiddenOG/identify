import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { AutoClaim } from "@/components/discover/auto-claim";
import { ClaimViewTracker } from "@/components/discover/claim-view-tracker";
import { PortfolioCard } from "@/components/discover/portfolio-card";
import { GoogleSignIn } from "@/components/google-sign-in";
import { requestClaim } from "@/lib/discover/actions";
import { suggestUsername } from "@/lib/discover/host";
import { getPortfolio } from "@/lib/discover/portfolios";
import { onboardingHref } from "@/lib/next-path";
import { getCurrentUser } from "@/lib/profiles";
import { SITE_URL } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Claim your portfolio", robots: { index: false } };

export default function ClaimPortfolioPage({ params, searchParams }: PageProps<"/discover/claim/[id]">) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      {hasSupabaseEnv && (
        <Suspense>
          <Claim params={params} searchParams={searchParams} />
        </Suspense>
      )}
    </main>
  );
}

const button = "rounded-full bg-foreground px-5 py-2 text-sm text-background hover:opacity-90 disabled:opacity-60";
const outline = "rounded-full border border-foreground px-5 py-2 text-sm hover:bg-surface";

async function Claim({ params, searchParams }: Pick<PageProps<"/discover/claim/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const raw = (await searchParams).t;
  // The private code from an invite email: opening that link proves the email reached them.
  const token = typeof raw === "string" && /^[a-f0-9]{24,64}$/.test(raw) ? raw : undefined;
  const supabase = await createClient();
  const [portfolio, { userId, profile }] = await Promise.all([getPortfolio(supabase, id), getCurrentUser(supabase)]);
  if (!portfolio || portfolio.status === "removed") notFound();

  const here = `/discover/claim/${portfolio.id}${token ? `?t=${token}` : ""}`;
  const first = portfolio.name.trim().split(/\s+/)[0];
  const handle = profile?.username ?? suggestUsername(portfolio.name);
  const card = (
    <div className="mb-10 max-w-sm">
      <PortfolioCard portfolio={portfolio} />
      {/* Every branch shows the card, so this logs each open of the claim link for Discover admin. */}
      <ClaimViewTracker portfolioId={portfolio.id} />
    </div>
  );
  const remove = (
    <p className="mt-10 border-t border-line pt-8 text-sm text-muted">
      Rather not be listed?{" "}
      <Link href={`/discover/remove/${portfolio.id}`} className="underline">
        Remove this listing
      </Link>
      . No account needed.
    </p>
  );

  if (portfolio.status === "claimed") {
    return (
      <>
        <h1 className="mb-8 font-serif text-4xl font-bold">{portfolio.name}</h1>
        {card}
        <p>
          {portfolio.claimed_by === userId ? "You've claimed this portfolio." : "This portfolio has already been claimed."}{" "}
          <Link href={`/discover/remove/${portfolio.id}`} className="text-muted underline">
            Report a problem
          </Link>
        </p>
      </>
    );
  }

  // What they get, before anything is asked of them.
  const pitch = (
    <>
      <h1 className="font-serif text-4xl font-bold">{first}, your portfolio is on Identify</h1>
      <p className="mt-3 text-lg text-muted">Claim it free and it becomes your own page:</p>
      <ul className="mt-4 mb-8 space-y-2">
        <li>
          ✦ A CV website at <strong>{new URL(SITE_URL).host}/{handle || "yourname"}</strong>
        </li>
        <li>✦ Your projects, written up as stories people can read and share</li>
        <li>✦ Found by recruiters searching by skill, and featured on Discover</li>
      </ul>
    </>
  );

  if (!userId) {
    return (
      <>
        {pitch}
        {card}
        <p className="mb-4 text-muted">
          {token
            ? "Sign in with any account and it's yours straight away."
            : "Sign in or create a free account to claim it. If we emailed you, use that email address and it's yours straight away."}
        </p>
        <div className="max-w-sm space-y-3">
          <GoogleSignIn
            next={here}
            fallback={
              <Link href={`/login?mode=signup&next=${encodeURIComponent(here)}`} className={`${button} block text-center`}>
                Create a free account
              </Link>
            }
          />
          <div className="flex flex-wrap gap-3">
            <Link href={`/login?mode=signup&next=${encodeURIComponent(here)}`} className={outline}>
              Sign up with email
            </Link>
            <Link href={`/login?next=${encodeURIComponent(here)}`} className={outline}>
              Sign in
            </Link>
          </div>
        </div>
        {remove}
      </>
    );
  }

  if (!profile?.username) {
    return (
      <>
        {pitch}
        {card}
        <Link href={onboardingHref(here)} className={button}>
          Pick your username to finish
        </Link>
        {remove}
      </>
    );
  }

  const { data: pending } = await supabase
    .from("portfolio_claims")
    .select("portfolio_id")
    .eq("portfolio_id", portfolio.id)
    .eq("user_id", userId)
    .maybeSingle();

  return (
    <>
      <h1 className="mb-8 font-serif text-4xl font-bold">Claim your portfolio</h1>
      {card}
      <AutoClaim
        portfolioId={portfolio.id}
        token={token}
        username={profile.username}
        fallback={
          pending ? (
            <p className="rounded-lg border border-line bg-surface p-4 text-sm">
              Your request to claim this is waiting for review. We&apos;ll confirm soon, usually within a day; you don&apos;t need to do
              anything else.
            </p>
          ) : (
            <section>
              <h2 className="text-lg font-bold">Signed up with a different email?</h2>
              <p className="mt-1 mb-4 text-muted">
                Your sign-in email isn&apos;t the one we contacted, so ask to claim it instead. We&apos;ll quickly check it&apos;s really you,
                then hand it over.
              </p>
              <ActionForm action={requestClaim} fields={{ id: portfolio.id }} hideOnSuccess className="space-y-3">
                <label className="block text-sm">
                  <span className="mb-1 block text-muted">Anything that helps us confirm it&apos;s you (optional)</span>
                  <textarea
                    name="note"
                    rows={2}
                    maxLength={500}
                    placeholder="e.g. I signed up with my work email, or a link to my LinkedIn"
                    className="w-full rounded-lg border border-line bg-background px-3 py-2 outline-none focus:border-foreground"
                  />
                </label>
                <button className={button}>Request to claim</button>
              </ActionForm>
            </section>
          )
        }
      />
      {remove}
    </>
  );
}
