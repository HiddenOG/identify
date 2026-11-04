import type { SupabaseClient } from "@supabase/supabase-js";
import { relativeTime } from "@/lib/time";

/** What happened after an invite went out, from portfolio_events (admins only, via RLS). */

export type ActivityKind = "claim_view" | "claimed" | "claim_requested" | "removed" | "invited";

export type ActivityEvent = {
  id: number;
  portfolio_id: string;
  kind: ActivityKind;
  visitor: string | null;
  created_at: string;
  user: { username: string | null } | null;
  /** "2 hours ago", worked out on the server. */
  when: string;
};

export type ListingActivity = {
  opens: number;
  /** Distinct browsers that opened the claim link. */
  people: number;
  lastOpen: string | null;
  claimedBy: string | null;
  claimedWhen: string | null;
};

export async function getDiscoverActivity(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("portfolio_events")
    .select("id, portfolio_id, kind, visitor, created_at, user:profiles!portfolio_events_user_id_fkey(username)")
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<Omit<ActivityEvent, "when">[]>();
  if (error) console.error("[discover.getDiscoverActivity]", error.message);

  const now = Date.now();
  const events: ActivityEvent[] = (data ?? []).map((e) => ({ ...e, when: relativeTime(e.created_at, now) }));

  const byListing = new Map<string, ListingActivity>();
  const visitors = new Map<string, Set<string>>();
  for (const e of events) {
    const a = byListing.get(e.portfolio_id) ?? { opens: 0, people: 0, lastOpen: null, claimedBy: null, claimedWhen: null };
    if (e.kind === "claim_view") {
      a.opens++;
      a.lastOpen ??= e.when; // newest first
      const seen = visitors.get(e.portfolio_id) ?? new Set<string>();
      seen.add(e.visitor ?? e.user?.username ?? String(e.id));
      visitors.set(e.portfolio_id, seen);
      a.people = seen.size;
    }
    if (e.kind === "claimed" && !a.claimedWhen) {
      a.claimedBy = e.user?.username ?? null;
      a.claimedWhen = e.when;
    }
    byListing.set(e.portfolio_id, a);
  }
  return { events, byListing };
}

/** Relative time for a stored timestamp, e.g. when someone was invited. */
export function ago(iso: string) {
  return relativeTime(iso, Date.now());
}
