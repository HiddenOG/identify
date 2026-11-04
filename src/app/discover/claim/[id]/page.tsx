import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { ClaimViewTracker } from "@/components/discover/claim-view-tracker";
import { PortfolioCard } from "@/components/discover/portfolio-card";
import { claimByEmail, requestClaim } from "@/lib/discover/actions";
import { getPortfolio } from "@/lib/discover/portfolios";
import { onboardingHref } from "@/lib/next-path";
import { getCurrentUser } from "@/lib/profiles";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Claim your portfolio", robots: { index: false } };

export default function ClaimPortfolioPage({ params }: PageProps<"/discover/claim/[id]">) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-serif text-4xl font-bold">Claim your portfolio</h1>
      <p className="mt-2 mb-8 text-muted">
        Claiming is free. The listing then links to your profile, and you decide what it shows.
      </p>
      {hasSupabaseEnv && (
        <Suspense>
          <Claim params={params} />
        </Suspense>
      )}
    </main>
  );
}

const button = "rounded-full bg-foreground px-5 py-2 text-sm text-background hover:opacity-90 disabled:opacity-60";

async function Claim({ params }: Pick<PageProps<"/discover/claim/[id]">, "params">) {
  const { id } = await params;
  const supabase = await createClient();
  const [portfolio, { userId, profile }] = await Promise.all([getPortfolio(supabase, id), getCurrentUser(supabase)]);
  if (!portfolio || portfolio.status === "removed") notFound();

  const card = (
    <div className="mb-10 max-w-sm">
      <PortfolioCard portfolio={portfolio} />
      {/* Every branch shows the card, so this logs each open of the claim link for Discover admin. */}
      <ClaimViewTracker portfolioId={portfolio.id} />
    </div>
  );

  // Invite links land here, often for people without an account: show what they're claiming first.
  const here = `/discover/claim/${portfolio.id}`;
  if (!userId || !profile?.username) {
    return (
      <>
        {card}
        {portfolio.status === "claimed" ? (
          <p>This portfolio has already been claimed.</p>
        ) : (
          <>
            <p className="mb-6 text-muted">
              Sign in or create a free account to claim it. If we emailed you, use that email address and the listing becomes
              yours straight away.
            </p>
            <div className="flex flex-wrap gap-3">
              {userId ? (
                <Link href={onboardingHref(here)} className={button}>
                  Pick your username to continue
                </Link>
              ) : (
                <>
                  <Link href={`/login?mode=signup&next=${encodeURIComponent(here)}`} className={button}>
                    Create an account
                  </Link>
                  <Link href={`/login?next=${encodeURIComponent(here)}`} className="rounded-full border border-foreground px-5 py-2 text-sm hover:bg-surface">
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </>
        )}
        <p className="mt-10 border-t border-line pt-8 text-sm text-muted">
          Rather not be listed?{" "}
          <Link href={`/discover/remove/${portfolio.id}`} className="underline">
            Remove this listing
          </Link>
          . No account needed.
        </p>
      </>
    );
  }

  if (portfolio.status === "claimed") {
    return (
      <>
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

  const { data: pending } = await supabase
    .from("portfolio_claims")
    .select("portfolio_id")
    .eq("portfolio_id", portfolio.id)
    .eq("user_id", userId)
    .maybeSingle();
  return (
    <>
      {card}
      {pending && (
        <p className="mb-8 rounded-lg border border-line bg-surface p-4 text-sm">
          Your request to claim this is waiting for review. We&apos;ll confirm soon, usually within a day; you don&apos;t need to do
          anything else.
        </p>
      )}

      <section className="border-t border-line py-8">
        <h2 className="text-lg font-bold">Did we email you?</h2>
        <p className="mt-1 mb-4 text-muted">If you signed in with the email we contacted you on, it&apos;s yours in one click.</p>
        <ActionForm action={claimByEmail} fields={{ id: portfolio.id }} hideOnSuccess>
          <button className={button}>Claim with my sign-in email</button>
        </ActionForm>
      </section>

      {!pending && (
        <section className="border-t border-line py-8">
          <h2 className="text-lg font-bold">Signed up with a different email?</h2>
          <p className="mt-1 mb-4 text-muted">
            Ask to claim it instead. We&apos;ll quickly check it&apos;s really you, then hand it over.
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
      )}

      <p className="border-t border-line pt-8 text-sm text-muted">
        Rather not be listed?{" "}
        <Link href={`/discover/remove/${portfolio.id}`} className="underline">
          Remove this listing
        </Link>
        .
      </p>
    </>
  );
}
