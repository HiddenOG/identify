import type { Metadata } from "next";
import Link from "next/link";
import { PortfolioDirectory } from "@/components/discover/portfolio-directory";
import { SetupNotice } from "@/components/setup-notice";
import { getCachedPortfolios } from "@/lib/discover/cached";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export const metadata: Metadata = {
  title: "Discover",
  description: "Exceptional people and the work that proves what they can do.",
};

export default async function DiscoverPage() {
  if (!hasSupabaseEnv) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-12">
        <SetupNotice />
      </main>
    );
  }

  // Only what an admin lists appears here; new sign-ups are never added automatically.
  const portfolios = await getCachedPortfolios();
  // Newest first, so every listing can be found by scrolling.
  const latest = portfolios.toSorted((a, b) => (b.listed_at ?? b.created_at).localeCompare(a.listed_at ?? a.created_at));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-bold sm:text-5xl">Discover</h1>
          <p className="mt-2 text-lg text-muted">Exceptional people, and the work that proves what they can do.</p>
        </div>
        <Link href="/discover/suggest" className="rounded-full border border-foreground px-5 py-2 text-sm hover:bg-surface">
          Suggest a portfolio
        </Link>
      </div>

      {/* Tabs (All, Featured, the categories, Discover projects) come straight under the heading. */}
      {portfolios.length === 0 ? (
        <p className="py-10 text-muted">
          Nothing here yet.{" "}
          <Link href="/discover/suggest" className="text-foreground underline">
            Suggest a portfolio
          </Link>{" "}
          you think deserves to be seen.
        </p>
      ) : (
        <PortfolioDirectory portfolios={latest} />
      )}
    </main>
  );
}
