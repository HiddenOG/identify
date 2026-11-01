import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ProjectEditor } from "@/components/project-editor";
import { getCurrentUser } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "New story" };

export default function NewProjectPage() {
  return (
    <main>
      <Suspense>
        <NewProject />
      </Suspense>
    </main>
  );
}

async function NewProject() {
  const { userId, profile } = await getCurrentUser(await createClient());
  if (!userId) redirect("/login?next=/new");
  if (!profile?.username) redirect("/onboarding");
  return <ProjectEditor userId={userId} />;
}
