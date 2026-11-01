"use server";

import { updateTag } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { PROFILES_TAG, RESERVED_USERNAMES, USERNAME_PATTERN } from "@/lib/profiles";
import { PROJECTS_TAG } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";

export type AccountState = { ok?: string; error?: string };

async function session() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return { supabase, userId: data?.claims?.sub ?? null };
}

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(USERNAME_PATTERN, "3–30 characters: lowercase letters, numbers, - or _.")
  .refine((u) => !RESERVED_USERNAMES.has(u), "That username is reserved.");

export async function updateUsername(_: AccountState, formData: FormData): Promise<AccountState> {
  const parsed = usernameSchema.safeParse(formData.get("username"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase, userId } = await session();
  if (!userId) return { error: "Your session expired. Sign in again." };

  const { error } = await supabase.from("profiles").update({ username: parsed.data }).eq("id", userId);
  // 23505 = unique_violation on profiles.username
  if (error) return { error: error.code === "23505" ? "That username is taken." : error.message };

  // Feeds and cards link by username, so both cached lists change.
  updateTag(PROFILES_TAG);
  updateTag(PROJECTS_TAG);
  return { ok: `Your profile is now at /${parsed.data}.` };
}

export async function updateEmail(_: AccountState, formData: FormData): Promise<AccountState> {
  const parsed = z.email("Enter a valid email.").safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase, userId } = await session();
  if (!userId) return { error: "Your session expired. Sign in again." };

  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const { error } = await supabase.auth.updateUser(
    { email: parsed.data },
    { emailRedirectTo: `${origin}/auth/callback?next=/settings` },
  );
  if (error) return { error: error.message };
  return { ok: `Check ${parsed.data} (and your current inbox) for a link to confirm the change.` };
}

const passwordSchema = z
  .object({
    password: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "The passwords don't match.", path: ["confirm"] });

export async function updatePassword(_: AccountState, formData: FormData): Promise<AccountState> {
  const parsed = passwordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { supabase, userId } = await session();
  if (!userId) return { error: "Your session expired. Sign in again." };

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };
  return { ok: "Password updated." };
}

export async function setOpenToWork(open: boolean): Promise<AccountState> {
  const { supabase, userId } = await session();
  if (!userId) return { error: "Your session expired. Sign in again." };
  const { error } = await supabase.from("profiles").update({ open_to_work: open }).eq("id", userId);
  if (error) return { error: error.message };
  updateTag(PROFILES_TAG);
  return { ok: open ? "Recruiters can now find you under Open to work." : "You're no longer listed as open to work." };
}

/** Ends every session on every device, including this one. */
export async function signOutEverywhere() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}

/** Removes the user's uploaded files, then the account (the database cascades the rest). */
export async function deleteAccount(_: AccountState, formData: FormData): Promise<AccountState> {
  const { supabase, userId } = await session();
  if (!userId) return { error: "Your session expired. Sign in again." };

  const { data: profile } = await supabase.from("profiles").select("username").eq("id", userId).maybeSingle();
  const typed = String(formData.get("confirm") ?? "").trim().toLowerCase();
  if (!profile?.username || typed !== profile.username) return { error: `Type ${profile?.username ?? "your username"} to confirm.` };

  for (const bucket of ["avatars", "project-images"]) {
    // Pages of 100; capped so a storage hiccup can't loop forever.
    for (let page = 0; page < 50; page++) {
      const { data: files } = await supabase.storage.from(bucket).list(userId, { limit: 100 });
      if (!files?.length) break;
      const { error } = await supabase.storage.from(bucket).remove(files.map((f) => `${userId}/${f.name}`));
      if (error) return { error: `Couldn't remove your files: ${error.message}` };
    }
  }

  const { error } = await supabase.rpc("delete_own_account");
  if (error) return { error: error.message };

  updateTag(PROFILES_TAG);
  updateTag(PROJECTS_TAG);
  await supabase.auth.signOut({ scope: "local" });
  redirect("/?deleted=1");
}
