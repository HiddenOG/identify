import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthorAvatar } from "@/components/author-avatar";
import { SetupNotice } from "@/components/setup-notice";
import { getNotifications, type NotificationRow } from "@/lib/notifications";
import { getCurrentUser } from "@/lib/profiles";
import { formatDate, projectHref } from "@/lib/projects";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { MarkRead } from "./mark-read";

export const metadata: Metadata = { title: "Notifications", robots: { index: false } };

export default function NotificationsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-8 font-serif text-4xl font-bold">Notifications</h1>
      {hasSupabaseEnv ? (
        <Suspense>
          <NotificationList />
        </Suspense>
      ) : (
        <SetupNotice />
      )}
    </main>
  );
}

async function NotificationList() {
  const supabase = await createClient();
  const { userId, profile } = await getCurrentUser(supabase);
  if (!userId) redirect("/login?next=/notifications");
  if (!profile?.username) redirect("/onboarding");

  const items = await getNotifications(supabase, userId);
  const unread = items.filter((n) => !n.read_at).length;

  if (items.length === 0) {
    return (
      <p className="text-muted">
        Nothing yet. Likes, comments and new followers show up here.{" "}
        <Link href="/new" className="text-foreground underline">
          Post a project
        </Link>{" "}
        to get things going.
      </p>
    );
  }

  return (
    <>
      <MarkRead unread={unread} />
      <ul className="divide-y divide-line">
        {items.map((n) => (
          <li key={n.id} className={`flex gap-3 py-4 ${n.read_at ? "" : "-mx-3 rounded-lg bg-brand/15 px-3"}`}>
            <Link href={`/${n.actor.username}`} className="shrink-0">
              <AuthorAvatar name={n.actor.full_name || n.actor.username} url={n.actor.avatar_url} size={40} />
            </Link>
            <div className="min-w-0 text-sm">
              <p>
                <Link href={`/${n.actor.username}`} className="font-semibold hover:underline">
                  {n.actor.full_name || n.actor.username}
                </Link>{" "}
                <Describe n={n} username={profile.username!} />
              </p>
              {n.comment && <p className="mt-1 line-clamp-2 text-muted">“{n.comment.body}”</p>}
              <p className="mt-1 text-xs text-muted">{formatDate(n.created_at)}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Likes and comments are always on the recipient's own projects, so links use their username. */
function Describe({ n, username }: { n: NotificationRow; username: string }) {
  const listing = (
    <Link href="/admin/discover" className="font-medium underline">
      {n.portfolio?.name ?? "a Discover listing"}
    </Link>
  );
  if (n.type === "portfolio_claimed") return <>claimed their Discover listing, {listing}. 🎉</>;
  if (n.type === "portfolio_claim_request") return <>asked to claim {listing}. Review it in Discover admin.</>;
  if (n.type === "follow") return <>started following you.</>;
  if (n.type === "story_featured")
    return (
      <>
        featured{" "}
        {n.project ? (
          <Link href={projectHref(username, n.project.slug)} className="font-medium underline">
            {n.project.title}
          </Link>
        ) : (
          "your story"
        )}{" "}
        on the home page. ✦
      </>
    );
  if (n.type === "featured")
    return (
      <>
        wrote about your work:{" "}
        {n.project ? (
          <Link href={projectHref(n.actor.username, n.project.slug)} className="font-medium underline">
            {n.project.title}
          </Link>
        ) : (
          "a new feature"
        )}
        . ✨
      </>
    );
  const project = n.project ? (
    <Link href={projectHref(username, n.project.slug)} className="font-medium underline">
      {n.project.title}
    </Link>
  ) : (
    "a project"
  );
  return n.type === "like" ? <>liked {project}.</> : <>commented on {project}:</>;
}
