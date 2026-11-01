import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PortfolioCard } from "@/components/discover/portfolio-card";
import { ShowMore } from "@/components/show-more";
import { getCachedPortfolios } from "@/lib/discover/cached";
import { categoryInfo, isPortfolioCategory, PORTFOLIO_CATEGORIES } from "@/lib/discover/categories";
import { hasSupabaseEnv } from "@/lib/supabase/env";

export function generateStaticParams() {
  return PORTFOLIO_CATEGORIES.map((c) => ({ category: c.id }));
}

export async function generateMetadata({ params }: PageProps<"/discover/[category]">): Promise<Metadata> {
  const { category } = await params;
  if (!isPortfolioCategory(category)) return {};
  const info = categoryInfo(category);
  return { title: info.label, description: info.blurb };
}

export default async function DiscoverCategoryPage({ params }: PageProps<"/discover/[category]">) {
  const { category } = await params;
  if (!isPortfolioCategory(category)) notFound();
  const info = categoryInfo(category);
  const portfolios = hasSupabaseEnv ? await getCachedPortfolios(category) : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/discover" className="text-sm text-muted hover:text-foreground">
        ← Discover
      </Link>
      <h1 className="mt-4 font-serif text-4xl font-bold sm:text-5xl">{info.label}</h1>
      <p className="mt-2 mb-10 text-lg text-muted">{info.blurb}</p>

      {portfolios.length === 0 ? (
        <p className="text-muted">
          Nothing here yet.{" "}
          <Link href="/discover/suggest" className="text-foreground underline">
            Suggest a portfolio
          </Link>
        </p>
      ) : (
        <ShowMore
          className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
          items={portfolios.map((p) => (
            <PortfolioCard key={p.id} portfolio={p} />
          ))}
        />
      )}
    </main>
  );
}
