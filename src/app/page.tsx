import { Suspense, type ReactNode } from "react";
import { cacheLife, cacheTag } from "next/cache";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthorAvatar } from "@/components/author-avatar";
import { ClaimForm } from "@/components/claim-form";
import { PortfolioBento } from "@/components/discover/portfolio-card";
import { FeedTabs } from "@/components/feed-tabs";
import { JsonLd } from "@/components/json-ld";
import { GetStarted } from "@/components/get-started";
import { FollowButton } from "@/components/follow-button";
import { HeroBalloons } from "@/components/hero-balloons";
import { LavaLamp, type LavaBlob } from "@/components/lava-lamp";
import { ProjectCard } from "@/components/project-card";
import { SetupNotice } from "@/components/setup-notice";
import { TagLink } from "@/components/tag-link";
import { getCachedFeatures, getCachedPortfolios } from "@/lib/discover/cached";
import { FeatureHero } from "@/components/discover/feature-card";
import { getFollowingIds } from "@/lib/follows";
import { getForYou } from "@/lib/for-you";
import { getCurrentUser, isSignedInMember, PROFILES_TAG, toFullProfile, type FullProfile, type ProfileRow } from "@/lib/profiles";
import { formatDate, getFeatured, getFeed, getTrending, projectHref, PROJECTS_TAG, topTags, type ProjectWithAuthor } from "@/lib/projects";
import { CONTACT_EMAIL, FOOTER_LINKS, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

async function getNewestProfiles() {
  "use cache";
  cacheLife("minutes");
  cacheTag(PROFILES_TAG);

  const { data } = await createPublicClient()
    .from("profiles")
    .select("*")
    .not("username", "is", null)
    .order("created_at", { ascending: false })
    .limit(12)
    .returns<ProfileRow[]>();
  return (data ?? []).map(toFullProfile);
}

/** Recent stories: Latest shows the first 30; For you ranks all of them per reader. */
async function getCachedFeed() {
  "use cache";
  cacheLife("minutes");
  cacheTag(PROJECTS_TAG);
  return getFeed(createPublicClient(), 100);
}

async function getCachedFeatured() {
  "use cache";
  cacheLife("minutes");
  cacheTag(PROJECTS_TAG);
  return getFeatured(createPublicClient());
}

async function getCachedTrending() {
  "use cache";
  cacheLife("minutes");
  cacheTag(PROJECTS_TAG);
  return getTrending(createPublicClient());
}

/** Who Identify is, and how to search it (Google can show a search box for the site). */
const SITE_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/email/logo.png`,
      email: CONTACT_EMAIL,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
      potentialAction: { "@type": "SearchAction", target: `${SITE_URL}/search?q={search_term_string}`, "query-input": "required name=search_term_string" },
    },
  ],
};

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default async function Home() {
  const [profiles, pool, trending, picked] = hasSupabaseEnv
    ? await Promise.all([getNewestProfiles(), getCachedFeed(), getCachedTrending(), getCachedFeatured()])
    : [[], [], [], []];
  const feed = pool.slice(0, 30);
  const tags = topTags(feed, 9);
  const mostLiked = feed
    .filter((p) => p.like_count > 0)
    .toSorted((a, b) => b.like_count - a.like_count)
    .slice(0, 3);
  // Like Medium: stories the editors featured. Until there are any, the best work lately.
  const featured = picked.length > 0 ? picked : trending.length > 0 ? trending : feed;
  const noProjects = (
    <p className="py-8 text-muted">
      No projects yet.{" "}
      <Link href="/new" className="text-foreground underline">
        Post the first one.
      </Link>
    </p>
  );

  const cards = (projects: ProjectWithAuthor[]) =>
    projects.length === 0 ? noProjects : projects.map((project) => <ProjectCard key={project.id} project={project} />);
  const featuredTab = { id: "featured", label: "Featured", content: cards(featured) };
  const latestTab = { id: "latest", label: "Latest", content: cards(feed) };

  return (
    <main>
      <JsonLd data={SITE_DATA} />
      {/* Visitors get the landing hero; signed-in people go straight to the feed. */}
      <Suspense>
        <Landing />
      </Suspense>

      {!hasSupabaseEnv ? (
        <div className="mx-auto max-w-6xl px-4 py-12">
          <SetupNotice />
        </div>
      ) : (
        <div id="feed" className="mx-auto flex max-w-6xl scroll-mt-14 justify-center gap-12 px-4 sm:px-6 xl:gap-20">
          <section className="min-w-0 max-w-[680px] flex-1 py-8">
            <Suspense>
              <GetStarted />
            </Suspense>
            <DiscoverStrip />
            {/* Featured first and selected for everyone; members also get For you (needs their session). */}
            <Suspense fallback={<FeedTabs tabs={[featuredTab, latestTab]} />}>
              <HomeFeed pool={pool} tabs={[featuredTab, latestTab]} empty={noProjects} />
            </Suspense>
          </section>

          <aside className="hidden w-[25rem] shrink-0 border-l border-line py-8 pl-8 lg:block">
            <div className="sticky top-22 space-y-10">
              <WriteCard />
              {mostLiked.length > 0 && <MostLiked projects={mostLiked} />}
              {tags.length > 0 && (
                <div>
                  <h2 className="mb-4 font-semibold">Recommended topics</h2>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <TagLink key={tag} tag={tag} />
                    ))}
                  </div>
                </div>
              )}
              <Suspense>
                <WhoToFollow candidates={profiles} />
              </Suspense>
              {/* Visitors already get these in the page footer. */}
              <nav className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted landing:hidden">
                {FOOTER_LINKS.map((l) => (
                  <Link key={l.href} href={l.href} className="hover:text-foreground">
                    {l.label}
                  </Link>
                ))}
              </nav>
            </div>
          </aside>
        </div>
      )}

      <Suspense>
        <ClaimBand />
      </Suspense>
    </main>
  );
}

type FeedTab = { id: string; label: string; content: ReactNode };

async function HomeFeed({ pool, tabs, empty }: { pool: ProjectWithAuthor[]; tabs: FeedTab[]; empty: ReactNode }) {
  const supabase = await createClient();
  const { userId, profile } = await getCurrentUser(supabase);
  if (!userId || !profile) return <FeedTabs tabs={tabs} />;

  const { stories, tuned } = await getForYou(supabase, userId, pool);
  const forYou = (
    <>
      {!tuned && (
        <p className="mb-2 rounded-lg bg-surface px-4 py-3 text-sm text-muted">
          Follow people and like or save stories, and this tab learns what you&apos;re into.
        </p>
      )}
      {stories.length === 0 ? empty : stories.map((project) => <ProjectCard key={project.id} project={project} />)}
    </>
  );
  const [featuredTab, ...rest] = tabs;
  return <FeedTabs tabs={[featuredTab, { id: "for-you", label: "For you", content: forYou }, ...rest]} />;
}

async function Landing() {
  if (hasSupabaseEnv && (await isSignedInMember(await createClient()))) return null;

  return (
    <>
      <section className="relative overflow-hidden border-b border-foreground">
        <HeroBalloons />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
          <h1 className="max-w-3xl font-serif text-[clamp(2.75rem,11vw,6rem)] leading-[0.95] font-medium tracking-tight">
            {SITE_TAGLINE.replace(/\.$/, "")}
          </h1>
          <p className="mt-8 max-w-xl text-xl sm:text-2xl">
            Get your own CV website, and show the projects behind it, written up like stories.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <a href="#feed" className="rounded-full bg-foreground px-8 py-3 text-lg text-background hover:opacity-90">
              Start reading
            </a>
            <Link href="/login?mode=signup&next=/settings/cv" className="rounded-full border border-foreground px-8 py-3 text-lg hover:bg-surface">
              Upload your CV
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

/** Above the feed for everyone: three portfolios from Discover, featured first. Cached, no cookies. */
async function DiscoverStrip() {
  const [portfolios, [pick]] = await Promise.all([getCachedPortfolios(), getCachedFeatures(undefined, 1)]);
  if (portfolios.length === 0 && !pick) return null;
  return (
    <>
      {/* The latest Editor's pick (or newest feature) from Identify Discoveries. */}
      {pick && (
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between gap-4">
            <h2 className="text-xl font-bold">{pick.editors_pick ? "Editor’s pick" : "From Discover projects"}</h2>
            <Link href="/discover/features" className="shrink-0 text-sm font-medium text-success hover:underline">
              More stories
            </Link>
          </div>
          <FeatureHero feature={pick} />
        </section>
      )}
      {portfolios.length > 0 && <PortfolioStrip portfolios={portfolios} />}
    </>
  );
}

function PortfolioStrip({ portfolios }: { portfolios: Awaited<ReturnType<typeof getCachedPortfolios>> }) {
  return (
    <section className="mb-12">
      <div className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="text-xl font-bold">Discover exceptional people</h2>
        <Link href="/discover" className="shrink-0 text-sm font-medium text-success hover:underline">
          Explore
        </Link>
      </div>
      <PortfolioBento portfolios={portfolios} />
    </section>
  );
}

/** Visitors only, at the bottom of the page: claim a username, newsletter-style. */
async function ClaimBand() {
  if (hasSupabaseEnv && (await isSignedInMember(await createClient()))) return null;
  return (
    <section className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-2xl flex-col items-center px-4 py-16 text-center">
        <h2 className="font-serif text-4xl font-medium tracking-tight sm:text-5xl">Claim your CV website</h2>
        <p className="mt-3 text-muted">Your CV and your projects at one link. Free, and yours in a minute.</p>
        <div className="mt-8 w-full max-w-xl text-left">
          <ClaimForm />
        </div>
      </div>
    </section>
  );
}

// The card's own small lava lamp: deeper and paler greens rising through the lime.
const CARD_BLOBS: LavaBlob[] = [
  { x: 18, y: 70, size: 70, color: "#5fbf2e", drift: 28, period: 14 },
  { x: 45, y: 35, size: 48, color: "#e6fbd6", drift: 30, period: 11 },
  { x: 72, y: 75, size: 84, color: "#4fae22", drift: 24, period: 17 },
  { x: 90, y: 25, size: 44, color: "#e6fbd6", drift: 22, period: 12 },
  { x: 32, y: 15, size: 36, color: "#5fbf2e", drift: 26, period: 9 },
  { x: 60, y: 10, size: 30, color: "#cdf5ad", drift: 20, period: 13 },
];

const CARD_LINKS = [
  { href: "/new", label: "Write up a project like a README" },
  { href: "/settings/cv", label: "Upload your CV and let AI fill it in" },
  { href: "/preview/classic", label: "See a sample CV website" },
  { href: "/people", label: "Hiring? Find people by skill" },
];

function WriteCard() {
  return (
    <div className="overflow-hidden rounded-lg border border-line">
      <div className="relative h-36 bg-brand">
        <LavaLamp blobs={CARD_BLOBS} pushRadius={70} goo={8} />
        <div className="absolute inset-x-5 bottom-0 h-14 rounded-t-md bg-background px-4 pt-4 font-serif text-muted">
          <Link href="/new" className="flex items-center gap-3 hover:text-foreground">
            <span className="grid size-6 place-items-center rounded-full border border-current text-sm">+</span>
            Post a project
          </Link>
        </div>
      </div>
      <div className="space-y-2 p-5 text-sm">
        <p className="font-semibold">Your CV website, your projects, one link</p>
        {CARD_LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="block text-muted hover:text-foreground">
            {l.label} ↗
          </Link>
        ))}
      </div>
    </div>
  );
}

function MostLiked({ projects }: { projects: ProjectWithAuthor[] }) {
  return (
    <div>
      <h2 className="mb-4 font-semibold">Most liked</h2>
      <ul className="space-y-5">
        {projects.map((p) => {
          const name = p.author.full_name || p.author.username;
          return (
            <li key={p.id}>
              <Link href={`/${p.author.username}`} className="mb-1.5 flex items-center gap-2 text-xs hover:underline">
                <AuthorAvatar name={name} url={p.author.avatar_url} size={20} />
                {name}
              </Link>
              <Link href={projectHref(p.author.username, p.slug)} className="block leading-snug font-bold hover:underline">
                {p.title}
              </Link>
              <p className="mt-1 text-xs text-muted">{formatDate(p.published_at)}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Newest builders the viewer doesn't already follow. Dynamic: depends on who is signed in. */
async function WhoToFollow({ candidates }: { candidates: FullProfile[] }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub ?? null;
  const followed = new Set(userId ? await getFollowingIds(supabase, userId) : []);
  const people = candidates.filter((p) => p.id !== userId && !followed.has(p.id)).slice(0, 4);
  if (people.length === 0) return null;

  return (
    <div>
      <h2 className="mb-4 font-semibold">Who to follow</h2>
      <ul className="space-y-4">
        {people.map(({ id, view }) => {
          const name = view.fullName || view.username;
          return (
            <li key={id} className="flex items-start gap-3">
              <Link href={`/${view.username}`} className="shrink-0">
                <AuthorAvatar name={name} url={view.avatarUrl} size={32} />
              </Link>
              <Link href={`/${view.username}`} className="min-w-0 flex-1">
                <span className="block truncate text-sm font-bold hover:underline">{name}</span>
                <span className="line-clamp-2 text-xs text-muted">{view.headline || `@${view.username}`}</span>
              </Link>
              <FollowButton
                profileId={id}
                following={false}
                followers={0}
                signedIn={Boolean(userId)}
                loginHref={`/login?next=/${view.username}`}
                compact
              />
            </li>
          );
        })}
      </ul>
      <Link href="/people" className="mt-4 block text-sm text-muted hover:text-foreground">
        See more people
      </Link>
    </div>
  );
}
