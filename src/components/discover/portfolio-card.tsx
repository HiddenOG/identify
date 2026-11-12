import Link from "next/link";
import { SiteImage } from "@/components/discover/site-image";
import type { Portfolio } from "@/lib/discover/portfolios";
import { displayHost } from "@/lib/discover/host";

const pill = "rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase";

/**
 * A portfolio on Discover: the site's preview image and the person behind it. Claimed listings get
 * an "On Identify" badge; unclaimed ones keep a quiet "Is this you?" link (the owner invites people
 * personally, so there's no "Unclaimed" label).
 */
export function PortfolioCard({ portfolio, size = "md", priority }: { portfolio: Portfolio; size?: "md" | "lg"; priority?: boolean }) {
  const host = displayHost(portfolio.url);
  const username = portfolio.status === "claimed" ? portfolio.member?.username : null;
  const meta = [portfolio.role, portfolio.location].filter(Boolean).join(" · ");

  return (
    <article className="group flex h-full min-w-0 flex-col">
      <a
        href={portfolio.url}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block min-h-0 flex-1 overflow-hidden rounded-2xl border border-line"
        aria-label={`${portfolio.name}'s website (${host})`}
      >
        <SiteImage
          src={portfolio.image_url}
          host={host}
          className={`size-full transition-transform duration-500 group-hover:scale-[1.02] ${size === "lg" ? "min-h-64" : "aspect-[16/10]"}`}
          sizes={size === "lg" ? "(max-width: 768px) 100vw, 700px" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 400px"}
          priority={priority}
        />
        <span className="absolute bottom-3 left-3 rounded-full bg-background/85 px-3 py-1 text-sm backdrop-blur">{host} ↗</span>
      </a>
      <div className="mt-3 flex items-center gap-2">
        {username ? (
          <Link href={`/${username}`} className="truncate font-bold hover:underline">
            {portfolio.name}
          </Link>
        ) : (
          <span className="truncate font-bold">{portfolio.name}</span>
        )}
        {username && <span className={`${pill} border-success text-success`}>On Identify</span>}
      </div>
      {meta && <p className="truncate text-sm text-muted">{meta}</p>}
      {!username && (
        <Link href={`/discover/claim/${portfolio.id}`} className="mt-1 text-xs text-muted hover:text-foreground">
          Is this you? Claim it
        </Link>
      )}
    </article>
  );
}

/** One large card with two stacked beside it, like an editor's pick. Falls back gracefully for 1–2. */
export function PortfolioBento({ portfolios, priority }: { portfolios: Portfolio[]; priority?: boolean }) {
  const [first, ...rest] = portfolios.slice(0, 3);
  if (!first) return null;
  return (
    <div className="grid gap-6 md:grid-cols-[3fr_2fr]">
      <PortfolioCard portfolio={first} size="lg" priority={priority} />
      {rest.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-1">
          {rest.map((p) => (
            <PortfolioCard key={p.id} portfolio={p} />
          ))}
        </div>
      )}
    </div>
  );
}
