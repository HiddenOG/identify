import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ProjectCard } from "@/components/project-card";
import { SetupNotice } from "@/components/setup-notice";
import { getFollowingIds } from "@/lib/follows";
import { getFeedByAuthors } from "@/lib/projects";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Following" };

export default function FollowingPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8 flex gap-6 border-b border-line text-sm">
        <Link href="/" className="pb-3 text-muted hover:text-foreground">
          Latest
        </Link>
        <span className="border-b border-foreground pb-3 font-semibold">Following</span>
      </div>
      {hasSupabaseEnv ? (
        <Suspense>
          <FollowingFeed />
        </Suspense>
      ) : (
        <SetupNotice />
      )}
    </main>
  );
}

async function FollowingFeed() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login?next=/following");

  const ids = await getFollowingIds(supabase, userId);
  const projects = await getFeedByAuthors(supabase, ids);

  if (ids.length === 0) {
    return (
      <p className="text-muted">
        You don&apos;t follow anyone yet.{" "}
        <Link href="/people" className="text-foreground underline">
          Find people to follow.
        </Link>
      </p>
    );
  }
  if (projects.length === 0) {
    return <p className="text-muted">The people you follow haven&apos;t posted projects yet.</p>;
  }
  return projects.map((p) => <ProjectCard key={p.id} project={p} />);
}
