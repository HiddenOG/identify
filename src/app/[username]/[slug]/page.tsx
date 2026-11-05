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
import { getFeatureSubject, sectionInfo, subjectHref, type FeatureSubject } from "@/lib/features";
import { displayHost } from "@/lib/discover/site";
import { RemoteImage } from "@/components/remote-image";
import { isAdmin } from "@/lib/discover/portfolios";
import { publishProject, setStoryFeatured } from "@/lib/project-actions";
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
  const [liked, comments, counts, following, saved, subject, admin] = await Promise.all([
    hasLiked(supabase, project.id, userId),
    getComments(supabase, project.id),
    getFollowCounts(supabase, project.author_id),
    isFollowing(supabase, userId, project.author_id),
    isBookmarked(supabase, userId, project.id),
    // An Identify Discoveries feature: the person it's about (null once their listing is removed).
    getFeatureSubject(supabase, project),
    userId ? isAdmin(supabase) : false,
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

      {project.feature_section && (
        <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold tracking-[0.12em] uppercase">
          <Link href="/discover/features" className="hover:underline">
            {SITE_NAME} Discoveries
          </Link>
          <span className="text-muted">·</span>
          <Link href={`/discover/features/${sectionInfo(project.feature_section).id}`} className="text-muted hover:text-foreground">
            {sectionInfo(project.feature_section).label}
          </Link>
          {project.editors_pick && <span className="rounded-full bg-brand px-2 py-0.5 text-brand-ink">Editor&apos;s pick</span>}
        </p>
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
            {project.featured_at && project.status === "published" && <span className="text-success"> · ✦ Featured</span>}
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
              {/* Admins pick what goes on the home feed's Featured tab. */}
              {admin && (
                <form action={setStoryFeatured}>
                  <input type="hidden" name="id" value={project.id} />
                  <input type="hidden" name="on" value={String(!project.featured_at)} />
                  <button className="text-sm text-muted hover:text-foreground">
                    {project.featured_at ? "Unfeature" : "Feature on home"}
                  </button>
                </form>
              )}
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
              {subject || project.feature_section ? "See the work ↗" : "Live demo ↗"}
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

      {subject && <CreatorCard subject={subject} authorName={authorName} workUrl={project.demo_url} />}

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
              {subject || project.feature_section ? "Written by" : "Built by"} {authorName}
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

/** "The creator": who a Discoveries feature is about, and where their own work lives. */
function CreatorCard({ subject, authorName, workUrl }: { subject: FeatureSubject; authorName: string; workUrl: string | null }) {
  const href = subjectHref(subject);
  const onIdentify = Boolean(subject.member?.username);
  const name = subject.member?.full_name || subject.name;
  // Their own site (for someone on Discover), or the project's link (for a member).
  const work = subject.url ?? workUrl;
  const host = work ? displayHost(work) : null;
  const external = { target: "_blank", rel: "noopener noreferrer" };
  return (
    <section className="mt-12 rounded-2xl border border-line p-5 sm:p-6">
      <p className="text-xs font-semibold tracking-[0.12em] text-muted uppercase">The creator</p>
      <div className="mt-4 flex items-start gap-4">
        <Link href={href} {...(onIdentify ? {} : external)} className="shrink-0">
          <AuthorAvatar name={name} url={subject.member?.avatar_url ?? null} size={56} />
        </Link>
        <div className="min-w-0 flex-1">
          <Link href={href} {...(onIdentify ? {} : external)} className="text-lg font-bold hover:underline">
            {name}
          </Link>
          {subject.role && <p className="text-sm text-muted">{subject.role}</p>}
          {subject.description && <p className="mt-2 line-clamp-3 text-sm">{subject.description}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            {work && (
              <a href={work} {...external} className="rounded-full border border-foreground px-4 py-1.5 text-sm hover:bg-surface">
                {host} ↗
              </a>
            )}
            {onIdentify ? (
              <Link href={href} className="rounded-full bg-brand px-4 py-1.5 text-sm font-medium text-brand-ink hover:opacity-90">
                View their profile
              </Link>
            ) : (
              subject.listingId && (
                <Link href={`/discover/claim/${subject.listingId}`} className="rounded-full px-4 py-1.5 text-sm text-muted hover:text-foreground">
                  Is this you? Claim your profile
                </Link>
              )
            )}
          </div>
        </div>
      </div>
      <p className="mt-5 border-t border-line pt-4 text-xs text-muted">
        Editorial feature by {authorName}.{" "}
        {work && (
          <>
            {name}&apos;s original work lives at{" "}
            <a href={work} {...external} className="underline">
              {host}
            </a>
            ;{" "}
          </>
        )}
        our commentary is our own.
      </p>
    </section>
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
