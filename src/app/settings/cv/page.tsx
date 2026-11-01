import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { CVProject } from "@/components/cv/types";
import { getCurrentUser, toFullProfile } from "@/lib/profiles";
import { getProjectsByAuthor, projectHref } from "@/lib/projects";
import { createClient } from "@/lib/supabase/server";
import { THEME_PRESETS } from "@/lib/themes";
import { CvEditor, type EditorState } from "./cv-editor";

export const metadata: Metadata = { title: "Edit your CV" };

export default function CvSettingsPage() {
  return (
    <Suspense>
      <CvSettings />
    </Suspense>
  );
}

async function CvSettings() {
  const supabase = await createClient();
  const { userId, profile: row } = await getCurrentUser(supabase);
  if (!userId) redirect("/login?next=/settings/cv");
  if (!row?.username) redirect("/onboarding");

  const profile = toFullProfile(row);
  const storedPreset = (row.theme as { preset?: string } | null)?.preset;
  const initial: EditorState = {
    username: row.username,
    full_name: row.full_name ?? "",
    headline: row.headline ?? "",
    location: row.location ?? "",
    avatar_url: row.avatar_url ?? "",
    open_to_work: row.open_to_work,
    cv: profile.cv,
    // A brand-new profile has no stored theme: treat it as the default preset.
    theme: { ...profile.theme, preset: storedPreset ?? (Object.keys(row.theme ?? {}).length ? undefined : "lime") },
  };
  if (initial.theme.preset && !(initial.theme.preset in THEME_PRESETS)) initial.theme.preset = undefined;

  const projects: CVProject[] = (await getProjectsByAuthor(supabase, userId))
    .filter((p) => p.status === "published")
    .map((p) => ({
      title: p.title,
      summary: p.summary,
      coverUrl: p.cover_url,
      href: projectHref(row.username!, p.slug),
      demoUrl: p.demo_url,
      repoUrl: p.repo_url,
    }));

  return <CvEditor userId={userId} initial={initial} projects={projects} />;
}
