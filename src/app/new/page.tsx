import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProjectEditor } from "@/components/project-editor";
import { isAdmin } from "@/lib/discover/portfolios";
import { getAboutChoice } from "@/lib/features";
import { getCurrentUser } from "@/lib/profiles";
import { IDENTIFY_USERNAME } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New story", robots: { index: false } };

export default function NewProjectPage({ searchParams }: PageProps<"/new">) {
  return (
    <main>
      <Suspense>
        <NewProject searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function NewProject({ searchParams }: Pick<PageProps<"/new">, "searchParams">) {
  const supabase = await createClient();
  const { userId, profile } = await getCurrentUser(supabase);
  if (!userId) redirect("/login?next=/new");
  if (!profile?.username) redirect("/onboarding");
  // Admins get the editorial panel; ?about=<listing> comes from "Write a feature" in Discover admin.
  const { about } = await searchParams;
  const editorial = (await isAdmin(supabase))
    ? {
        initialAbout: typeof about === "string" ? await getAboutChoice(supabase, { about_portfolio: about }) : null,
        notifyByDefault: profile.username === IDENTIFY_USERNAME,
      }
    : undefined;
  return <ProjectEditor userId={userId} editorial={editorial} />;
}
