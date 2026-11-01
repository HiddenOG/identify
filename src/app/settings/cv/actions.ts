"use server";

import { updateTag } from "next/cache";
import { z } from "zod";
import { cvSchema } from "@/lib/cv/schema";
import { PROFILES_TAG } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { themeSchema } from "@/lib/themes";

const settingsSchema = z.object({
  full_name: z.string().trim().min(1, "Enter your name.").max(80),
  headline: z.string().trim().max(120),
  location: z.string().trim().max(80),
  avatar_url: z
    .string()
    .max(500)
    .refine((v) => v === "" || /^https:\/\/\S+$/.test(v), "Invalid photo URL."),
  open_to_work: z.boolean(),
  cv: cvSchema,
  theme: themeSchema,
});

export type SettingsInput = z.input<typeof settingsSchema>;

export async function saveSettings(input: SettingsInput): Promise<{ ok?: true; error?: string }> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return { error: `${issue.path.join(" → ") || "Form"}: ${issue.message}` };
  }

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return { error: "Your session expired. Sign in again." };

  const { avatar_url, ...rest } = parsed.data;
  const { error } = await supabase
    .from("profiles")
    .update({ ...rest, avatar_url: avatar_url || null })
    .eq("id", userId);
  if (error) return { error: error.message };

  updateTag(PROFILES_TAG);
  return { ok: true };
}
