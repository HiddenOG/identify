import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AuthorAvatar } from "@/components/author-avatar";
import { BookmarkButton } from "@/components/bookmark-button";
import { Comments } from "@/components/comments";
import { TrackView } from "@/components/track-view";
import { isBookmarked } from "@/lib/stats";
import { FollowButton } from "@/components/follow-button";
import { MessageButton } from "@/components/message-button";
import { CommentIcon } from "@/components/icons";
import { LogoMark } from "@/components/logo";
import { LikeButton } from "@/components/like-button";
import { Markdown } from "@/components/markdown";
import { TagLink } from "@/components/tag-link";
import { getFollowCounts, isFollowing } from "@/lib/follows";
import { RemoteImage } from "@/components/remote-image";
import { publishProject } from "@/lib/project-actions";
import { SITE_NAME } from "@/lib/site";
import { getCurrentUser } from "@/lib/profiles";
import { formatDate, getProject, previewMarkdown, readingMinutes } from "@/lib/projects";
import { getComments, hasLiked } from "@/lib/social";
import { hasSupabaseEnv } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: PageProps<"/[username]/[slug]">): Promise<Metadata> {
  if (!hasSupabaseEnv) return {};
  const { username, slug } = await params;
  const project = await getProject(createPublicClient(), username, slug);
  if (!project) return {};
  return {
    title: project.title,
    description: project.summary ?? undefined,
    // The card itself (title, author and cover) comes from opengraph-image.tsx next to this page.
    openGraph: { type: "article", url: `/${username}/${slug}` },
  };
}

export default function ProjectPage({ params }: PageProps<"/[username]/[slug]">) {
  return (
    <main className="mx-auto max-w-[728px] px-4 py-12 sm:px-6">
      <Suspense>
        <Project params={params} />
      </Suspense>
    </main>
  );
}

async function Project({ params }: Pick<PageProps<"/[username]/[slug]">, "params">) {
  if (!hasSupabaseEnv) notFound();
  const { username, slug } = await params;
  const supabase = await createClient();
  // RLS returns drafts only to their author.
  const project = await getProject(supabase, username, slug);
  if (!project) notFound();

  const { userId } = await getCurrentUser(supabase);
  const [liked, comments, counts, following, saved] = await Promise.all([
    hasLiked(supabase, project.id, userId),
    getComments(supabase, project.id),
    getFollowCounts(supabase, project.author_id),
    isFollowing(supabase, userId, project.author_id),
    isBookmarked(supabase, userId, project.id),
  ]);
  const isOwner = userId === project.author_id;
  const authorName = project.author.full_name || project.author.username;
  const loginHref = `/login?next=${encodeURIComponent(`/${username}/${slug}`)}`;
  // Like Medium: signed-out readers get the opening, then sign in to read the rest.
  const { text: body, cut: gated } = userId ? { text: project.body_md, cut: false } : previewMarkdown(project.body_md);
  const likeButton = (
    <LikeButton
      projectId={project.id}
      liked={liked}
      count={project.like_count}
      signedIn={Boolean(userId)}
      loginHref={loginHref}
    />
  );

  return (
    <article>
      {project.status === "draft" && isOwner && (
        // Medium-style draft bar: covers the site header (so no search) and offers Edit and Publish.
        <div className="fixed inset-x-0 top-0 z-50 h-14 border-b border-line bg-background">
          <div className="mx-auto flex h-full max-w-5xl items-center gap-4 px-4">
            <Link href="/" aria-label={`${SITE_NAME} home`} className="shrink-0">
              <LogoMark size={26} />
            </Link>
            <span className="text-sm">Draft</span>
            <span className="hidden text-sm text-muted sm:inline">Only you can see this</span>
            <form action={publishProject} className="ml-auto">
              <input type="hidden" name="id" value={project.id} />
              <button className="rounded-full bg-success px-4 py-1.5 text-sm font-medium text-background hover:opacity-90">
                Publish
              </button>
            </form>
          </div>
        </div>
      )}

      <h1 className="text-[2rem] leading-[1.2] font-extrabold tracking-tight sm:text-[2.6rem]">{project.title}</h1>
      {project.summary && <p className="mt-3 text-xl text-muted sm:text-[1.35rem]">{project.summary}</p>}

      <div className="mt-8 flex items-center gap-3">
        <Link href={`/${project.author.username}`}>
          <AuthorAvatar name={authorName} url={project.author.avatar_url} size={44} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={`/${project.author.username}`} className="font-medium hover:underline">
            {authorName}
          </Link>
          <p className="text-sm text-muted">
            {readingMinutes(project.body_md)} min read
            {project.published_at && <> · {formatDate(project.published_at)}</>}
          </p>
        </div>
      </div>

      {/* Medium-style action bar between two hairlines. */}
      <div className="mt-8 flex items-center gap-6 border-y border-line px-1 py-3">
        {project.status === "published" && (
          <>
            {likeButton}
            <a href="#responses" className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground" title="Responses">
              <CommentIcon size={22} /> {comments.length}
            </a>
            <span className="ml-auto flex items-center gap-5">
              {isOwner && (
                <Link href={`/${username}/${slug}/edit`} className="text-sm text-muted hover:text-foreground">
                  Edit project
                </Link>
              )}
              <BookmarkButton projectId={project.id} saved={saved} signedIn={Boolean(userId)} loginHref={loginHref} />
            </span>
          </>
        )}
        {project.status === "draft" && isOwner && (
          <Link href={`/${username}/${slug}/edit`} className="ml-auto text-sm text-muted hover:text-foreground">
            Edit project
          </Link>
        )}
      </div>

      {(project.demo_url || project.repo_url) && (
        <div className="mt-6 flex flex-wrap gap-3">
          {project.demo_url && (
            <a
              href={project.demo_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background"
            >
              Live demo ↗
            </a>
          )}
          {project.repo_url && (
            <a
              href={project.repo_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="rounded-full border border-foreground px-4 py-2 text-sm font-medium"
            >
              View code ↗
            </a>
          )}
        </div>
      )}

      {project.cover_url && (
        <RemoteImage src={project.cover_url} sizes="(max-width: 768px) 100vw, 728px" priority className="mt-8 h-auto w-full rounded-lg" />
      )}

      <div className={`mt-10 ${gated ? "relative max-h-[28rem] overflow-hidden" : ""}`}>
        <Markdown>{body}</Markdown>
        {gated && <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-linear-to-b from-transparent to-background" />}
      </div>
      {gated ? (
        <ReadGate authorName={authorName} next={`/${username}/${slug}`} responses={comments.length} />
      ) : (
        // Reaching this point counts as a read in the author's Stats.
        <span id="read-end" aria-hidden />
      )}
      {project.status === "published" && !isOwner && <TrackView projectId={project.id} endMarkerId="read-end" />}

      {project.tags.length > 0 && (
        <ul className="mt-10 flex flex-wrap gap-2">
          {project.tags.map((tag) => (
            <li key={tag}>
              <TagLink tag={tag} />
            </li>
          ))}
        </ul>
      )}

      {project.status === "published" && !gated && (
        <div className="mt-8 flex items-center gap-6 px-1">
          {likeButton}
          <a href="#responses" className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground" title="Responses">
            <CommentIcon size={22} /> {comments.length}
          </a>
        </div>
      )}

      {/* "Written by" block, Medium style: the CV is one click away. */}
      <div className="-mx-4 mt-12 bg-surface px-4 py-10 sm:-mx-6 sm:px-6">
        <Link href={`/${project.author.username}`}>
          <AuthorAvatar name={authorName} url={project.author.avatar_url} size={64} />
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href={`/${project.author.username}`} className="text-2xl font-bold tracking-tight hover:underline">
              Built by {authorName}
            </Link>
            <p className="mt-1 text-sm text-muted">
              {counts.followers} {counts.followers === 1 ? "follower" : "followers"} · {counts.following} following
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isOwner && (
              <FollowButton
                profileId={project.author_id}
                following={following}
                followers={counts.followers}
                signedIn={Boolean(userId)}
                loginHref={loginHref}
                compact
              />
            )}
            {!isOwner && <MessageButton profileId={project.author_id} signedIn={Boolean(userId)} loginHref={loginHref} />}
            <Link
              href={`/${project.author.username}`}
              className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-brand-ink hover:opacity-90"
            >
              View CV
            </Link>
          </div>
        </div>
      </div>

      {project.status === "published" && !gated && (
        <Comments
          projectId={project.id}
          projectOwnerId={project.author_id}
          comments={comments}
          userId={userId}
          loginHref={loginHref}
        />
      )}
    </article>
  );
}

/** Where the preview ends for signed-out readers: sign in (or join) to read the rest. */
function ReadGate({ authorName, next, responses }: { authorName: string; next: string; responses: number }) {
  const back = encodeURIComponent(next);
  return (
    <div className="relative mt-2 rounded-2xl border border-line px-6 py-10 text-center">
      <h2 className="font-serif text-2xl font-bold sm:text-3xl">Sign in to keep reading</h2>
      <p className="mx-auto mt-3 max-w-md text-muted">
        Read the rest of {authorName}&apos;s write-up{responses > 0 ? ` and ${responses} ${responses === 1 ? "response" : "responses"}` : ""}. It&apos;s
        free, and you get your own CV website too.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href={`/login?mode=signup&next=${back}`} className="rounded-full bg-foreground px-6 py-2.5 text-background hover:opacity-90">
          Create a free account
        </Link>
        <Link href={`/login?next=${back}`} className="rounded-full border border-foreground px-6 py-2.5 hover:bg-surface">
          Sign in
        </Link>
      </div>
    </div>
  );
}
