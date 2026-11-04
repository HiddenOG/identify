import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RenderTemplate } from "@/components/cv/render-template";
import type { CVProject } from "@/components/cv/types";
import { FollowButton } from "@/components/follow-button";
import { MessageButton } from "@/components/message-button";
import { PrintButton } from "@/components/print-button";
import { getFollowCounts, isFollowing } from "@/lib/follows";
import { getCurrentUser, getProfileByUsername } from "@/lib/profiles";
import { getProjectsByAuthor, projectHref } from "@/lib/projects";
import { SITE_NAME } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[username]">): Promise<Metadata> {
  if (!hasSupabaseEnv) return {};
  const { username } = await params;
  const profile = await getProfileByUsername(createPublicClient(), username);
  if (!profile) return {};
  const name = profile.view.fullName || profile.view.username;
  const fallback = [profile.view.headline, profile.view.location].filter(Boolean).join(" · ");
  return {
    title: profile.view.headline ? `${name} — ${profile.view.headline}` : name,
    description: profile.cv.summary.slice(0, 160) || fallback || `${name}'s CV and projects.`,
    // The card itself comes from opengraph-image.tsx next to this page.
    openGraph: { type: "profile", url: `/${profile.view.username}` },
  };
}

export default function ProfilePage({ params }: PageProps<"/[username]">) {
  return (
    <main>
      <Suspense>
        <Profile params={params} />
      </Suspense>
    </main>
  );
}

async function Profile({ params }: Pick<PageProps<"/[username]">, "params">) {
  if (!hasSupabaseEnv) notFound();
  const { username } = await params;
  const supabase = await createClient();
  const profile = await getProfileByUsername(supabase, username);
  if (!profile) notFound();

  const [{ userId }, rows, counts] = await Promise.all([
    getCurrentUser(supabase),
    getProjectsByAuthor(supabase, profile.id),
    getFollowCounts(supabase, profile.id),
  ]);
  const isOwner = userId === profile.id;
  const following = await isFollowing(supabase, userId, profile.id);
  const loginHref = `/login?next=/${profile.view.username}`;
  const cvIsEmpty = !profile.cv.summary && profile.cv.experience.length === 0 && profile.cv.skills.length === 0;
  const drafts = rows.filter((p) => p.status === "draft");
  const projects: CVProject[] = rows
    .filter((p) => p.status === "published")
    .map((p) => ({
      title: p.title,
      summary: p.summary,
      coverUrl: p.cover_url,
      href: projectHref(profile.view.username, p.slug),
      demoUrl: p.demo_url,
      repoUrl: p.repo_url,
    }));

  return (
    <>
      {/* Same width and side margins as the header row, so the actions line up under its buttons. */}
      <div className="border-b border-line print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 px-4 py-3 text-sm sm:px-6 signed-out:mx-auto signed-out:max-w-6xl">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {isOwner ? (
              <span className="text-muted">
                <strong className="text-foreground">{counts.followers}</strong> {counts.followers === 1 ? "follower" : "followers"}
              </span>
            ) : (
              <FollowButton
                profileId={profile.id}
                following={following}
                followers={counts.followers}
                signedIn={Boolean(userId)}
                loginHref={loginHref}
              />
            )}
            <span className="text-muted">
              <strong className="text-foreground">{counts.following}</strong> following
            </span>
          </div>
          <div className="flex items-center gap-x-5">
            {!isOwner && <MessageButton profileId={profile.id} signedIn={Boolean(userId)} loginHref={loginHref} />}
            {/* Downloading a CV needs an account. */}
            {userId ? (
              <PrintButton className="text-muted underline-offset-4 hover:text-foreground hover:underline" />
            ) : (
              <Link href={loginHref} className="text-muted underline-offset-4 hover:text-foreground hover:underline">
                ⤓ Download PDF
              </Link>
            )}
          </div>
        </div>
      </div>
      {isOwner && (
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-b border-line bg-highlight px-4 py-3 text-center text-sm print:hidden">
          {cvIsEmpty && <span>Your CV is empty.</span>}
          <Link href="/settings/cv" className="rounded-full bg-foreground px-3 py-1 font-medium text-background">
            {cvIsEmpty ? "Fill in your CV" : "Edit CV"}
          </Link>
          {drafts.length > 0 && (
            <span>
              Drafts:{" "}
              {drafts.map((d, i) => (
                <span key={d.id}>
                  {i > 0 && ", "}
                  <Link href={projectHref(profile.view.username, d.slug)} className="underline">
                    {d.title}
                  </Link>
                </span>
              ))}
            </span>
          )}
          <Link href="/new" className="font-medium underline">
            + New project
          </Link>
        </div>
      )}
      {/* Printing to PDF while signed out (Ctrl+P) gets a sign-in note instead of the CV. */}
      <div className="signed-out:print:hidden">
        <RenderTemplate
          template={profile.template}
          profile={profile.view}
          cv={profile.cv}
          theme={profile.theme}
          projects={projects}
        />
      </div>
      <p className="hidden p-12 text-center text-lg signed-out:print:block">
        Sign in to {SITE_NAME} to download {profile.view.fullName || profile.view.username}&apos;s CV.
      </p>
    </>
  );
}
