import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { CopyInviteButton } from "@/components/discover/copy-invite-button";
import { SiteImage } from "@/components/discover/site-image";
import { approveClaim, bulkAddPortfolios, markInvited, rejectClaim, setPortfolioStatus, storeAllImages, toggleFeatured } from "@/lib/discover/actions";
import { categoryInfo } from "@/lib/discover/categories";
import { ago, getDiscoverActivity, type ActivityEvent, type ActivityKind, type ListingActivity } from "@/lib/discover/activity";
import { isAdmin, type Portfolio } from "@/lib/discover/portfolios";
import { displayHost } from "@/lib/discover/site";
import { getCurrentUser } from "@/lib/profiles";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";
import { inviteHtml, inviteSubject, inviteText } from "@/lib/discover/invite";
import { hasSupabaseEnv, supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { formatDate, projectHref } from "@/lib/projects";
import { PortfolioForm } from "@/components/discover/portfolio-form";

export const metadata: Metadata = { title: "Discover admin", robots: { index: false } };

export default function DiscoverAdminPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="font-serif text-4xl font-bold">Discover admin</h1>
      {hasSupabaseEnv && (
        <Suspense>
          <Admin />
        </Suspense>
      )}
    </main>
  );
}

type Contact = { portfolio_id: string; email: string | null; invited_at: string | null; do_not_contact: boolean };
type Claim = { portfolio_id: string; user_id: string; created_at: string; note?: string | null; profile: { username: string | null } | null };
type FeatureRow = { about_portfolio: string; slug: string; title: string; status: string; author: { username: string } | null };
/** A listing's newest Discoveries feature (published wins over drafts). */
type ListingFeature = { title: string; href: string; published: boolean };

type Removal = { id: string; portfolio_id: string | null; email: string | null; reason: string | null; created_at: string };

const small = "rounded-full border border-line px-3 py-1 text-xs hover:border-foreground disabled:opacity-50";

async function Admin() {
  const supabase = await createClient();
  if (!(await isAdmin(supabase))) notFound();

  const [{ profile }, { events, byListing }, portfolios, contacts, claims, removals, features] = await Promise.all([
    getCurrentUser(supabase),
    getDiscoverActivity(supabase),
    supabase.from("portfolios").select("*").order("created_at", { ascending: false }).limit(500).returns<Portfolio[]>(),
    supabase.from("portfolio_contacts").select("*").returns<Contact[]>(),
    supabase
      .from("portfolio_claims")
      .select("*, profile:profiles!portfolio_claims_user_id_fkey(username)")
      .order("created_at")
      .returns<Claim[]>(),
    supabase.from("portfolio_removals").select("*").order("created_at", { ascending: false }).limit(20).returns<Removal[]>(),
    // Only your own drafts come back (RLS), plus everyone's published features.
    supabase
      .from("projects")
      .select("about_portfolio, slug, title, status, author:profiles!projects_author_id_fkey(username)")
      .not("about_portfolio", "is", null)
      .order("created_at", { ascending: false })
      .returns<FeatureRow[]>(),
  ]);

  const all = portfolios.data ?? [];
  const byId = new Map(all.map((p) => [p.id, p]));
  const contactOf = new Map((contacts.data ?? []).map((c) => [c.portfolio_id, c]));
  const featureOf = new Map<string, ListingFeature>();
  for (const f of features.data ?? []) {
    // Rows are newest first: keep the newest published one, or the newest draft if none is published.
    const published = f.status === "published";
    const kept = featureOf.get(f.about_portfolio);
    if (!f.author || kept?.published || (kept && !published)) continue;
    featureOf.set(f.about_portfolio, { title: f.title, href: projectHref(f.author.username, f.slug), published });
  }
  const pending = all.filter((p) => p.status === "pending");
  const live = all.filter((p) => p.status === "listed" || p.status === "claimed");
  const signature = profile?.full_name || SITE_NAME;
  const storagePrefix = `${supabaseUrl}/storage/v1/object/public/`;
  const slowImages = all.filter((p) => p.status !== "removed" && p.image_url && !p.image_url.startsWith(storagePrefix)).length;

  return (
    <div className="mt-8 space-y-14">
      {slowImages > 0 && (
        <section className="rounded-xl border border-line bg-surface p-4 text-sm">
          <p className="mb-3">
            {slowImages} listing{slowImages === 1 ? "" : "s"} still load{slowImages === 1 ? "s" : ""} the preview image from the
            person&apos;s own site, which can be slow. Copy them here so they load fast, resized for each screen.
          </p>
          <ActionForm action={storeAllImages}>
            <button className="rounded-full bg-foreground px-4 py-1.5 text-background hover:opacity-90 disabled:opacity-60">
              Speed up images
            </button>
          </ActionForm>
        </section>
      )}

      <ActivityFeed events={events} names={new Map(all.map((p) => [p.id, p.name]))} />

      <section>
        <h2 className="mb-1 text-xl font-bold">Add a portfolio</h2>
        <p className="mb-4 text-sm text-muted">
          Paste the address and press Read site to pull its name, description and sharing image. Only list people, and only
          an email they publish for contact.
        </p>
        <PortfolioForm />
        <details className="mt-6 rounded-xl border border-line p-4">
          <summary className="cursor-pointer text-sm font-medium">Bulk add (paste a list)</summary>
          <p className="mt-3 text-sm text-muted">
            One portfolio per line, fields split by <code>|</code>: <code>url | name | role | location | category | email | description | image</code>.
            Only the url is needed; category is developer, design, data or other. Lines starting with # are skipped. Everything goes to
            Suggestions to review below, so nothing is public until you approve it.
          </p>
          <ActionForm action={bulkAddPortfolios} className="mt-3 space-y-3">
            <textarea
              name="list"
              rows={8}
              required
              placeholder="https://example.dev | Ada Obi | Frontend engineer | Lagos, Nigeria | developer | ada@example.dev"
              className="w-full rounded-lg border border-line bg-background px-3 py-2 font-mono text-xs outline-none focus:border-foreground"
            />
            <button className="rounded-full bg-foreground px-4 py-1.5 text-sm text-background hover:opacity-90 disabled:opacity-60">Add to review</button>
          </ActionForm>
        </details>
      </section>

      {claims.data && claims.data.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Claims to confirm ({claims.data.length})</h2>
          <ul className="divide-y divide-line border-y border-line">
            {claims.data.map((c) => {
              const p = byId.get(c.portfolio_id);
              const fields = { portfolio_id: c.portfolio_id, user_id: c.user_id };
              return (
                <li key={`${c.portfolio_id}-${c.user_id}`} className="flex flex-wrap items-start gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p>
                      <Link href={`/${c.profile?.username}`} className="font-bold hover:underline">
                        @{c.profile?.username}
                      </Link>{" "}
                      wants to claim <strong>{p?.name}</strong> ({p && displayHost(p.url)})
                    </p>
                    {c.note && <p className="mt-1 text-muted">“{c.note}”</p>}
                    <p className="text-xs text-muted">
                      {formatDate(c.created_at)} · Check it&apos;s them first, e.g. reply to the email on their site or message them
                      on LinkedIn.
                    </p>
                  </div>
                  <ActionForm action={approveClaim} fields={fields}>
                    <button className={small}>Approve</button>
                  </ActionForm>
                  <ActionForm action={rejectClaim} fields={fields}>
                    <button className={small}>Reject</button>
                  </ActionForm>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {pending.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Suggestions to review ({pending.length})</h2>
          <PortfolioList portfolios={pending} contactOf={contactOf} featureOf={featureOf} signature={signature} activity={byListing} />
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-bold">On Discover ({live.length})</h2>
        {live.length === 0 ? (
          <p className="text-muted">Nothing listed yet.</p>
        ) : (
          <PortfolioList portfolios={live} contactOf={contactOf} featureOf={featureOf} signature={signature} activity={byListing} />
        )}
      </section>

      {removals.data && removals.data.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Recent removal requests</h2>
          <ul className="divide-y divide-line border-y border-line text-sm">
            {removals.data.map((r) => {
              const p = r.portfolio_id ? byId.get(r.portfolio_id) : null;
              return (
                <li key={r.id} className="flex flex-wrap items-start gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p>
                      <strong>{p?.name ?? "Deleted listing"}</strong> {p && <span className="text-muted">({p.status})</span>}
                    </p>
                    {r.reason && <p className="text-muted">“{r.reason}”</p>}
                    <p className="text-xs text-muted">
                      {r.email ?? "No email"} · {formatDate(r.created_at)}
                    </p>
                  </div>
                  {p?.status === "claimed" && (
                    <ActionForm action={setPortfolioStatus} fields={{ id: p.id, status: "removed" }}>
                      <button className={small}>Remove anyway</button>
                    </ActionForm>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

/** The designed invite for one listing. Links always use the live site, even when testing locally. */
function inviteFor(p: Portfolio, signature: string, feature?: ListingFeature) {
  const details = {
    name: p.name,
    host: displayHost(p.url),
    categoryLabel: categoryInfo(p.category).label,
    categoryUrl: `${SITE_URL}/discover/${p.category}`,
    claimUrl: `${SITE_URL}/discover/claim/${p.id}`,
    removeUrl: `${SITE_URL}/discover/remove/${p.id}`,
    sender: signature.split(/\s+/)[0],
    location: p.location,
    feature: feature?.published ? { title: feature.title, url: `${SITE_URL}${feature.href}` } : undefined,
  };
  return { subject: inviteSubject(p.name, Boolean(details.feature)), html: inviteHtml(details), text: inviteText(details) };
}

function PortfolioList({
  portfolios,
  contactOf,
  featureOf,
  signature,
  activity,
}: {
  portfolios: Portfolio[];
  contactOf: Map<string, Contact>;
  featureOf: Map<string, ListingFeature>;
  signature: string;
  activity: Map<string, ListingActivity>;
}) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {portfolios.map((p) => {
        const contact = contactOf.get(p.id);
        const a = activity.get(p.id);
        const feature = featureOf.get(p.id);
        const canInvite = p.status === "listed" && contact?.email && !contact.do_not_contact;
        return (
          <li key={p.id} className="py-4">
            <div className="flex gap-4">
              <a href={p.url} target="_blank" rel="noopener noreferrer" className="w-28 shrink-0 overflow-hidden rounded-lg border border-line">
                <SiteImage src={p.image_url} host={displayHost(p.url)} className="aspect-[16/10] w-full p-1! text-xs!" />
              </a>
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate">
                  <strong>{p.name}</strong> <span className="text-muted">· {displayHost(p.url)}</span>
                </p>
                <p className="truncate text-muted">
                  {[categoryInfo(p.category).label, p.role, p.location].filter(Boolean).join(" · ")}
                </p>
                <p className="text-xs text-muted">
                  {p.status}
                  {p.featured && " · featured"}
                  {p.source === "suggested" && " · suggested"}
                  {contact?.do_not_contact && " · do not contact"}
                  {contact?.invited_at && ` · invited ${ago(contact.invited_at)}`}
                </p>
                {/* What happened after the invite: link opens and the claim. */}
                {(a?.opens || a?.claimedWhen) && (
                  <p className="mt-1 text-xs">
                    {a.opens > 0 && (
                      <span className="text-foreground">
                        Claim link opened {a.opens}× by {a.people} {a.people === 1 ? "person" : "people"}, last {a.lastOpen}
                      </span>
                    )}
                    {a.claimedWhen && (
                      <span className="text-success">
                        {a.opens > 0 && " · "}Claimed {a.claimedWhen}
                        {a.claimedBy && (
                          <>
                            {" "}
                            by{" "}
                            <Link href={`/${a.claimedBy}`} className="underline">
                              @{a.claimedBy}
                            </Link>
                          </>
                        )}
                      </span>
                    )}
                  </p>
                )}
                {feature && (
                  <p className="mt-1 text-xs">
                    {feature.published ? "Feature: " : "Feature draft: "}
                    <Link href={feature.href} className="underline">
                      {feature.title}
                    </Link>
                    {feature.published && canInvite && <span className="text-muted"> · the invite leads with it</span>}
                  </p>
                )}
                {contact?.invited_at && !a?.opens && !a?.claimedWhen && (
                  <p className="mt-1 text-xs text-muted">Invited, but the claim link hasn&apos;t been opened yet.</p>
                )}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-start gap-2">
              {p.status === "pending" && (
                <ActionForm action={setPortfolioStatus} fields={{ id: p.id, status: "listed" }}>
                  <button className={small}>Approve</button>
                </ActionForm>
              )}
              {p.status !== "pending" && (
                <ActionForm action={toggleFeatured} fields={{ id: p.id, featured: String(!p.featured) }}>
                  <button className={small}>{p.featured ? "Unfeature" : "Feature"}</button>
                </ActionForm>
              )}
              {p.status !== "pending" && !feature && (
                <Link href={`/new?about=${p.id}`} className={small}>
                  Write a feature
                </Link>
              )}
              {canInvite && (
                <>
                  <CopyInviteButton {...inviteFor(p, signature, feature)} to={contact.email!} fromAccount={CONTACT_EMAIL} className={small} />
                  <ActionForm action={markInvited} fields={{ id: p.id }}>
                    <button className={small}>Mark invited</button>
                  </ActionForm>
                </>
              )}
              {p.status === "listed" && !contact?.email && !contact?.do_not_contact && (
                <span className="self-center text-xs text-muted">
                  No email yet: add one in Edit details (or press Read site there) to send an invite.
                </span>
              )}
              <ActionForm action={setPortfolioStatus} fields={{ id: p.id, status: "removed" }}>
                <button className={`${small} text-danger`}>{p.status === "pending" ? "Reject" : "Remove"}</button>
              </ActionForm>
              <details className="w-full">
                <summary className="cursor-pointer text-xs text-muted hover:text-foreground">Edit details</summary>
                <div className="mt-3">
                  <PortfolioForm
                    initial={{
                      id: p.id,
                      url: p.url,
                      name: p.name,
                      role: p.role ?? "",
                      location: p.location ?? "",
                      description: p.description ?? "",
                      image_url: p.image_url ?? "",
                      category: p.category,
                      email: contact?.email ?? "",
                      featured: p.featured,
                    }}
                  />
                </div>
              </details>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

const ACTIVITY_TEXT: Record<ActivityKind, string> = {
  claim_view: "opened the claim link for",
  claimed: "claimed",
  claim_requested: "asked to claim",
  removed: "removed the listing for",
  invited: "invite marked as sent for",
};

/** The latest Discover events, newest first: who opened, claimed or removed what, and when. */
function ActivityFeed({ events, names }: { events: ActivityEvent[]; names: Map<string, string> }) {
  const recent = events.slice(0, 15);
  return (
    <section>
      <h2 className="mb-1 text-xl font-bold">Activity</h2>
      <p className="mb-4 text-sm text-muted">What happens after an invite goes out. Opens are counted once per person per 30 minutes; your own visits aren&apos;t counted.</p>
      {recent.length === 0 ? (
        <p className="text-sm text-muted">Nothing yet. Once you send invites, link opens and claims show up here.</p>
      ) : (
        <ul className="divide-y divide-line border-y border-line text-sm">
          {recent.map((e) => {
            const who = e.user?.username ? (
              <Link href={`/${e.user.username}`} className="font-semibold hover:underline">
                @{e.user.username}
              </Link>
            ) : e.kind === "invited" ? (
              <span className="font-semibold">You</span>
            ) : (
              <span className="font-semibold">Someone</span>
            );
            return (
              <li key={e.id} className={`flex flex-wrap items-baseline gap-x-1.5 py-2.5 ${e.kind === "claimed" ? "text-success" : ""}`}>
                {e.kind === "invited" ? (
                  <>
                    Invite sent to <strong>{names.get(e.portfolio_id) ?? "a deleted listing"}</strong>
                  </>
                ) : (
                  <>
                    {who} {ACTIVITY_TEXT[e.kind]} <strong>{names.get(e.portfolio_id) ?? "a deleted listing"}</strong>
                  </>
                )}
                <span className="ml-auto text-xs text-muted">{e.when}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
