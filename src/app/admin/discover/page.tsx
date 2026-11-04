import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { CopyInviteButton } from "@/components/discover/copy-invite-button";
import { SiteImage } from "@/components/discover/site-image";
import { approveClaim, markInvited, rejectClaim, setPortfolioStatus, storeAllImages, toggleFeatured } from "@/lib/discover/actions";
import { categoryInfo } from "@/lib/discover/categories";
import { isAdmin, type Portfolio } from "@/lib/discover/portfolios";
import { displayHost } from "@/lib/discover/site";
import { getCurrentUser } from "@/lib/profiles";
import { CONTACT_EMAIL, SITE_NAME, SITE_URL } from "@/lib/site";
import { inviteHtml, inviteSubject, inviteText } from "@/lib/discover/invite";
import { hasSupabaseEnv, supabaseUrl } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/projects";
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
type Claim = { portfolio_id: string; user_id: string; created_at: string; profile: { username: string | null } | null };
type Removal = { id: string; portfolio_id: string | null; email: string | null; reason: string | null; created_at: string };

const small = "rounded-full border border-line px-3 py-1 text-xs hover:border-foreground disabled:opacity-50";

async function Admin() {
  const supabase = await createClient();
  if (!(await isAdmin(supabase))) notFound();

  const [{ profile }, portfolios, contacts, claims, removals] = await Promise.all([
    getCurrentUser(supabase),
    supabase.from("portfolios").select("*").order("created_at", { ascending: false }).limit(500).returns<Portfolio[]>(),
    supabase.from("portfolio_contacts").select("*").returns<Contact[]>(),
    supabase
      .from("portfolio_claims")
      .select("*, profile:profiles!portfolio_claims_user_id_fkey(username)")
      .order("created_at")
      .returns<Claim[]>(),
    supabase.from("portfolio_removals").select("*").order("created_at", { ascending: false }).limit(20).returns<Removal[]>(),
  ]);

  const all = portfolios.data ?? [];
  const byId = new Map(all.map((p) => [p.id, p]));
  const contactOf = new Map((contacts.data ?? []).map((c) => [c.portfolio_id, c]));
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

      <section>
        <h2 className="mb-1 text-xl font-bold">Add a portfolio</h2>
        <p className="mb-4 text-sm text-muted">
          Paste the address and press Read site to pull its name, description and sharing image. Only list people, and only
          an email they publish for contact.
        </p>
        <PortfolioForm />
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
                      claims <strong>{p?.name}</strong> ({p && displayHost(p.url)})
                    </p>
                    <p className="text-xs text-muted">{formatDate(c.created_at)}</p>
                  </div>
                  <ActionForm action={approveClaim} fields={fields}>
                    <button className={small}>Check site &amp; approve</button>
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
          <PortfolioList portfolios={pending} contactOf={contactOf} signature={signature} />
        </section>
      )}

      <section>
        <h2 className="mb-4 text-xl font-bold">On Discover ({live.length})</h2>
        {live.length === 0 ? (
          <p className="text-muted">Nothing listed yet.</p>
        ) : (
          <PortfolioList portfolios={live} contactOf={contactOf} signature={signature} />
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
function inviteFor(p: Portfolio, signature: string) {
  const details = {
    name: p.name,
    host: displayHost(p.url),
    categoryLabel: categoryInfo(p.category).label,
    categoryUrl: `${SITE_URL}/discover/${p.category}`,
    claimUrl: `${SITE_URL}/discover/claim/${p.id}`,
    removeUrl: `${SITE_URL}/discover/remove/${p.id}`,
    sender: signature.split(/\s+/)[0],
  };
  return { subject: inviteSubject(p.name), html: inviteHtml(details), text: inviteText(details) };
}

function PortfolioList({
  portfolios,
  contactOf,
  signature,
}: {
  portfolios: Portfolio[];
  contactOf: Map<string, Contact>;
  signature: string;
}) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {portfolios.map((p) => {
        const contact = contactOf.get(p.id);
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
                  {contact?.invited_at && ` · invited ${formatDate(contact.invited_at)}`}
                </p>
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
              {canInvite && (
                <>
                  <CopyInviteButton {...inviteFor(p, signature)} to={contact.email!} fromAccount={CONTACT_EMAIL} className={small} />
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
