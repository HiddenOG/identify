"use server";

import { refresh, updateTag } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { isPortfolioCategory } from "./categories";
import { claimCode, getPortfolio, isAdmin, PORTFOLIOS_TAG } from "./portfolios";
import { normalizeUrl, readSitePreview, SiteError, siteContainsCode, type SitePreview } from "./site";

/** What every form on Discover gets back: a message to show, or an error. */
export type ActionState = { message?: string; error?: string } | null;

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function adminClient(): Promise<Supabase | null> {
  const supabase = await createClient();
  return (await isAdmin(supabase)) ? supabase : null;
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function changed() {
  updateTag(PORTFOLIOS_TAG);
  refresh();
}

// ---------- Admin ----------

/** Reads a site's sharing details to pre-fill the add/suggest form. Signed-in members only. */
export async function previewSite(url: string): Promise<{ preview?: SitePreview; error?: string }> {
  const { profile } = await getCurrentUser(await createClient());
  if (!profile) return { error: "Sign in first." };
  try {
    return { preview: await readSitePreview(url) };
  } catch (error) {
    if (error instanceof SiteError) return { error: error.message };
    console.error("[discover.previewSite]", error);
    return { error: "Couldn't read that site. Try again." };
  }
}

const optional = (max: number) => z.string().trim().max(max).transform((v) => v || null);

const portfolioSchema = z.object({
  name: z.string().trim().min(1, "Add a name.").max(120),
  role: optional(120),
  location: optional(120),
  description: optional(400),
  image_url: z.union([z.literal(""), z.url({ protocol: /^https?$/, message: "The image must be a web address." })]).transform((v) => v || null),
  category: z.string().refine(isPortfolioCategory, "Pick a category."),
  email: z.union([z.literal(""), z.email("That email doesn't look right.")]),
});

export async function savePortfolio(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { error: "Admins only." };

  const parsed = portfolioSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let url: string;
  try {
    url = normalizeUrl(text(formData, "url"));
  } catch (error) {
    return { error: error instanceof SiteError ? error.message : "Check the address." };
  }

  const { email, ...fields } = parsed.data;
  const id = text(formData, "id");
  const featured = formData.get("featured") === "on";
  const row = { ...fields, url, featured };

  const { data, error } = id
    ? await supabase.from("portfolios").update(row).eq("id", id).select("id").single()
    : await supabase
        .from("portfolios")
        .insert({ ...row, status: "listed", listed_at: new Date().toISOString() })
        .select("id")
        .single();
  if (error) return { error: error.code === "23505" ? "That site is already on Discover." : error.message };

  // Save the email, or clear it when an edit empties the box (do_not_contact is left as it is).
  if (email || id) {
    const { error: contactError } = await supabase
      .from("portfolio_contacts")
      .upsert({ portfolio_id: data.id, email: email || null }, { onConflict: "portfolio_id" });
    if (contactError) return { error: contactError.message };
  }

  changed();
  return { message: id ? "Saved." : `${fields.name} is listed.` };
}

export async function setPortfolioStatus(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { error: "Admins only." };
  const status = text(formData, "status");
  if (!["listed", "removed"].includes(status)) return { error: "Unknown status." };

  const update = status === "listed" ? { status, listed_at: new Date().toISOString() } : { status, featured: false, claimed_by: null };
  const { error } = await supabase.from("portfolios").update(update).eq("id", text(formData, "id"));
  if (error) return { error: error.message };
  changed();
  return { message: status === "listed" ? "Listed." : "Removed." };
}

export async function toggleFeatured(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { error: "Admins only." };
  const { error } = await supabase
    .from("portfolios")
    .update({ featured: formData.get("featured") === "true" })
    .eq("id", text(formData, "id"));
  if (error) return { error: error.message };
  changed();
  return null;
}

export async function markInvited(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { error: "Admins only." };
  const { error } = await supabase
    .from("portfolio_contacts")
    .update({ invited_at: new Date().toISOString() })
    .eq("portfolio_id", text(formData, "id"))
    .eq("do_not_contact", false);
  if (error) return { error: error.message };
  refresh();
  return { message: "Marked as invited." };
}

/** Re-checks the code on the site, then hands the listing to the member. */
export async function approveClaim(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { error: "Admins only." };
  const portfolioId = text(formData, "portfolio_id");
  const userId = text(formData, "user_id");
  const portfolio = await getPortfolio(supabase, portfolioId);
  if (!portfolio) return { error: "That listing is gone." };

  if (!(await siteContainsCode(portfolio.url, claimCode(portfolioId, userId)))) {
    return { error: "The code isn't on their site (any more). Not approved." };
  }
  const { error } = await supabase
    .from("portfolios")
    .update({ status: "claimed", claimed_by: userId, featured: portfolio.featured })
    .eq("id", portfolioId);
  if (error) return { error: error.code === "23505" ? "That member already has a claimed portfolio." : error.message };
  await supabase.from("portfolio_claims").delete().eq("portfolio_id", portfolioId);
  changed();
  return { message: "Approved." };
}

export async function rejectClaim(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await adminClient();
  if (!supabase) return { error: "Admins only." };
  const { error } = await supabase
    .from("portfolio_claims")
    .delete()
    .eq("portfolio_id", text(formData, "portfolio_id"))
    .eq("user_id", text(formData, "user_id"));
  if (error) return { error: error.message };
  refresh();
  return { message: "Rejected." };
}

// ---------- Members ----------

const suggestionSchema = portfolioSchema.omit({ email: true });

/** A member suggests a portfolio (theirs or someone else's). It waits for an admin. */
export async function suggestPortfolio(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { userId, profile } = await getCurrentUser(supabase);
  if (!userId || !profile) return { error: "Sign in to suggest a portfolio." };

  const parsed = suggestionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  let url: string;
  try {
    url = normalizeUrl(text(formData, "url"));
  } catch (error) {
    return { error: error instanceof SiteError ? error.message : "Check the address." };
  }

  // Fill in whatever they didn't (usually they pressed Read site already); skip it if the site can't or mustn't be read.
  let preview: SitePreview | null = null;
  if (!parsed.data.description || !parsed.data.image_url) {
    try {
      preview = await readSitePreview(url);
    } catch {}
  }

  const { error } = await supabase.from("portfolios").insert({
    ...parsed.data,
    url,
    description: parsed.data.description || preview?.description || null,
    image_url: parsed.data.image_url || preview?.imageUrl || null,
    source: "suggested",
    status: "pending",
    submitted_by: userId,
  });
  if (error) {
    return { error: error.code === "23505" ? "That site is already on Discover or waiting for review." : error.message };
  }
  return { message: "Thanks! We'll take a look and list it if it fits." };
}

/** Instant claim when the member signed in with the email we contacted them on. */
export async function claimByEmail(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { userId } = await getCurrentUser(supabase);
  if (!userId) return { error: "Sign in first." };

  const { data, error } = await supabase.rpc("claim_portfolio_by_email", { target: text(formData, "id") });
  if (error) return { error: error.message };
  if (!data) {
    return {
      error: "Your sign-in email isn't the one we have for this site (or you've already claimed a portfolio). Use the code instead.",
    };
  }
  changed();
  return { message: "It's yours. The listing now links to your profile." };
}

/** Looks for the member's code on the site; if it's there, the claim goes to an admin to confirm. */
export async function checkClaimCode(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { userId } = await getCurrentUser(supabase);
  if (!userId) return { error: "Sign in first." };

  const portfolio = await getPortfolio(supabase, text(formData, "id"));
  if (!portfolio || portfolio.status !== "listed") return { error: "This listing can't be claimed." };

  if (!(await siteContainsCode(portfolio.url, claimCode(portfolio.id, userId)))) {
    return { error: "We couldn't find the code on your home page yet. Publish it, wait a minute, then try again." };
  }
  const { error } = await supabase.from("portfolio_claims").upsert(
    { portfolio_id: portfolio.id, user_id: userId },
    { onConflict: "portfolio_id,user_id", ignoreDuplicates: true },
  );
  if (error) return { error: error.message };
  return { message: "Found it. We'll confirm your claim within a day; you can remove the code after that." };
}

// ---------- Anyone ----------

export async function requestRemoval(_: ActionState, formData: FormData): Promise<ActionState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("request_portfolio_removal", {
    target: text(formData, "id"),
    contact: text(formData, "email").slice(0, 200),
    why: text(formData, "reason").slice(0, 1000),
  });
  if (error) return { error: "Something went wrong. Try again." };
  if (data === "missing") return { error: "That listing doesn't exist (any more)." };
  if (data === "pending") return { message: "Thanks. This profile was claimed by its owner, so we'll review your request." };
  changed();
  return { message: "Done. The listing is gone, and we won't contact you about it." };
}
