import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProjectCard } from "@/components/project-card";
import { SetupNotice } from "@/components/setup-notice";
import { clearHistory } from "@/lib/social-actions";
import { getBookmarkedProjects, getHistory } from "@/lib/stats";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Library", robots: { index: false } };

export default function LibraryPage({ searchParams }: PageProps<"/library">) {
  return (
    <main className="mx-auto max-w-[728px] px-4 py-12 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight">Your library</h1>
      {hasSupabaseEnv ? (
        <Suspense>
          <Library searchParams={searchParams} />
        </Suspense>
      ) : (
        <SetupNotice />
      )}
    </main>
  );
}

async function Library({ searchParams }: Pick<PageProps<"/library">, "searchParams">) {
  const tab = (await searchParams).tab === "history" ? "history" : "saved";
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect(`/login?next=/library${tab === "history" ? "?tab=history" : ""}`);

  const projects = tab === "history" ? await getHistory(supabase, userId) : await getBookmarkedProjects(supabase, userId);
  const tabClass = (active: boolean) => `-mb-px pb-4 ${active ? "border-b border-foreground" : "text-muted hover:text-foreground"}`;

  return (
    <>
      <div className="mt-8 mb-6 flex items-center gap-8 border-b border-line text-sm">
        <Link href="/library" className={tabClass(tab === "saved")}>
          Saved
        </Link>
        <Link href="/library?tab=history" className={tabClass(tab === "history")}>
          History
        </Link>
        {tab === "history" && projects.length > 0 && (
          <form action={clearHistory} className="-mb-px ml-auto pb-4">
            <button className="text-muted hover:text-danger">Clear history</button>
          </form>
        )}
      </div>

      {projects.length === 0 ? (
        <p className="py-8 text-muted">
          {tab === "history"
            ? "Projects you open show up here, most recent first. Only you can see your history."
            : "Nothing saved yet. Tap the bookmark on any project to keep it here."}{" "}
          <Link href="/" className="text-foreground underline">
            Browse projects
          </Link>
        </p>
      ) : (
        projects.map((p) => <ProjectCard key={p.id} project={p} />)
      )}
    </>
  );
}
