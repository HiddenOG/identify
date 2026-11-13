import type { Metadata } from "next";
import Link from "next/link";
import { PortfolioForm } from "@/components/discover/portfolio-form";

export const metadata: Metadata = { title: "Suggest a portfolio", robots: { index: false } };

/** Signed-in members only (see the proxy). Suggestions wait for an admin before they're listed. */
export default function SuggestPortfolioPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <Link href="/discover" className="text-sm text-muted hover:text-foreground">
        ← Discover
      </Link>
      <h1 className="mt-4 font-serif text-4xl font-bold">Suggest a portfolio</h1>
      <p className="mt-2 mb-8 text-muted">
        Yours or someone else&apos;s: a personal site that shows great work. Paste the address and press Read site to fill in
        the details. We review every suggestion before it&apos;s listed.
      </p>
      <PortfolioForm mode="suggest" />
    </main>
  );
}
