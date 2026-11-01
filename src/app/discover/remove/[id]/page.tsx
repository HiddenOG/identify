import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ActionForm } from "@/components/action-form";
import { requestRemoval } from "@/lib/discover/actions";
import { getPortfolio } from "@/lib/discover/portfolios";
import { displayHost } from "@/lib/discover/site";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";

export const metadata: Metadata = { title: "Remove a listing", robots: { index: false } };

const field = "w-full rounded-lg border border-line bg-background px-3 py-2 outline-none focus:border-foreground";

/** No account needed: an unclaimed listing comes down as soon as this is sent. */
export default function RemovePortfolioPage({ params }: PageProps<"/discover/remove/[id]">) {
  return (
    <main className="mx-auto max-w-xl px-4 py-10">
      <h1 className="font-serif text-4xl font-bold">Remove a listing</h1>
      {hasSupabaseEnv && (
        <Suspense>
          <RemoveForm params={params} />
        </Suspense>
      )}
    </main>
  );
}

async function RemoveForm({ params }: Pick<PageProps<"/discover/remove/[id]">, "params">) {
  const { id } = await params;
  const portfolio = await getPortfolio(createPublicClient(), id);
  if (!portfolio) notFound();

  return (
    <>
      <p className="mt-2 mb-8 text-muted">
        This takes <strong className="text-foreground">{portfolio.name}</strong> ({displayHost(portfolio.url)}) off Discover. We
        won&apos;t contact you about it again. No account needed.
      </p>
      <ActionForm action={requestRemoval} fields={{ id: portfolio.id }} hideOnSuccess className="space-y-4">
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Your email (optional, if you&apos;d like a reply)</span>
          <input name="email" type="email" maxLength={200} className={field} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-muted">Anything we should know? (optional)</span>
          <textarea name="reason" rows={3} maxLength={1000} className={field} />
        </label>
        <button className="rounded-full bg-danger px-5 py-2 text-sm text-background hover:opacity-90 disabled:opacity-60">
          Remove this listing
        </button>
      </ActionForm>
    </>
  );
}
