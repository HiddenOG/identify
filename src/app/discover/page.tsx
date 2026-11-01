import type { Metadata } from "next";
import Link from "next/link";
import { PortfolioBento, PortfolioCard } from "@/components/discover/portfolio-card";
import { ShowMore } from "@/components/show-more";
import { SiteImage } from "@/components/discover/site-image";
import { RemoteImage } from "@/components/remote-image";
import { SetupNotice } from "@/components/setup-notice";
import { getCachedNewMembers, getCachedPortfolios } from "@/lib/discover/cached";
import { PORTFOLIO_CATEGORIES } from "@/lib/discover/categories";
import { displayHost } from "@/lib/discover/site";
import { SITE_NAME } from "@/lib/site";
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

  const [portfolios, members] = await Promise.all([getCachedPortfolios(), getCachedNewMembers()]);
  const featured = portfolios.slice(0, 3);
  const featuredIds = new Set(featured.map((p) => p.id));
  const shelves = PORTFOLIO_CATEGORIES.map((c) => {
    const items = portfolios.filter((p) => p.category === c.id);
    // Cover each tile with one that isn't already in Featured, when there is one.
    return { ...c, items, cover: items.find((p) => !featuredIds.has(p.id)) ?? items[0] };
  }).filter((c) => c.items.length > 0);
  // Newest first, so every listing can be found by scrolling.
  const latest = portfolios.toSorted((a, b) => (b.listed_at ?? b.created_at).localeCompare(a.listed_at ?? a.created_at));

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-serif text-4xl font-bold sm:text-5xl">Discover</h1>
          <p className="mt-2 text-lg text-muted">Exceptional people, and the work that proves what they can do.</p>
        </div>
        <Link href="/discover/suggest" className="rounded-full border border-foreground px-5 py-2 text-sm hover:bg-surface">
          Suggest a portfolio
        </Link>
      </div>

      {members.length > 0 && (
        <section className="mb-14">
          <h2 className="mb-4 text-xl font-bold">New on {SITE_NAME}</h2>
          <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 [scrollbar-width:none] sm:mx-0 sm:px-0">
            {members.map((m) => (
              <li key={m.id} className="w-40 shrink-0 snap-start sm:w-44">
                <Link href={`/${m.username}`} className="group block">
                  <div className="aspect-[4/5] overflow-hidden rounded-2xl border border-line bg-surface">
                    <RemoteImage
                      src={m.avatar_url!}
                      alt=""
                      sizes="176px"
                      className="size-full object-contain object-bottom transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <p className="mt-2 truncate font-bold group-hover:underline">{m.full_name || m.username}</p>
                  <p className="truncate text-sm text-muted">{m.headline || `@${m.username}`}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {portfolios.length === 0 ? (
        <p className="py-10 text-muted">
          Nothing here yet.{" "}
          <Link href="/discover/suggest" className="text-foreground underline">
            Suggest a portfolio
          </Link>{" "}
          you think deserves to be seen.
        </p>
      ) : (
        <>
          <section className="mb-14">
            <h2 className="mb-4 text-xl font-bold">Featured</h2>
            <PortfolioBento portfolios={featured} />
          </section>

          <section>
            <h2 className="mb-4 text-xl font-bold">Browse by discipline</h2>
            <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2">
              {shelves.map((c) => (
                <Link key={c.id} href={`/discover/${c.id}`} className="group block">
                  <div className="overflow-hidden rounded-2xl border border-line">
                    <SiteImage
                      src={c.cover.image_url}
                      host={displayHost(c.cover.url)}
                      className="aspect-[16/10] w-full transition-transform duration-500 group-hover:scale-[1.02]"
                    />
                  </div>
                  <h3 className="mt-3 text-lg font-bold group-hover:underline">{c.label}</h3>
                  <p className="text-muted">
                    {c.blurb} <span className="text-sm">· {c.items.length}</span>
                  </p>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-14">
            <h2 className="mb-4 text-xl font-bold">All portfolios ({portfolios.length})</h2>
            <ShowMore
              className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
              items={latest.map((p) => (
                <PortfolioCard key={p.id} portfolio={p} />
              ))}
            />
          </section>
        </>
      )}
    </main>
  );
}
