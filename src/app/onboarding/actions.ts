"use server";

import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { PROFILES_TAG, RESERVED_USERNAMES, USERNAME_PATTERN } from "@/lib/profiles";
import { safeNext } from "@/lib/next-path";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error?: string };

const onboardingSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(USERNAME_PATTERN, "3–30 characters: lowercase letters, numbers, - or _.")
    .refine((u) => !RESERVED_USERNAMES.has(u), "That username is reserved."),
  full_name: z.string().trim().min(1, "Enter your name.").max(80),
  headline: z.string().trim().max(120),
});

export async function completeOnboarding(_: OnboardingState, formData: FormData): Promise<OnboardingState> {
  const parsed = onboardingSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) redirect("/login?next=/onboarding");

  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", userId);
  if (error) {
    // 23505 = unique_violation on profiles.username
    return { error: error.code === "23505" ? "That username is taken." : error.message };
  }

  updateTag(PROFILES_TAG);
  // Back to where they were heading before signing up, or to their new page.
  const next = safeNext(formData.get("next"));
  redirect(next === "/" ? `/${parsed.data.username}` : next);
}
