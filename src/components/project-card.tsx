import Link from "next/link";
import { RemoteImage } from "@/components/remote-image";
import { AuthorAvatar } from "@/components/author-avatar";
import { CommentIcon, HeartIcon } from "@/components/icons";
import { TagLink } from "@/components/tag-link";
import { formatDate, projectHref, readingMinutes, type ProjectWithAuthor } from "@/lib/projects";

/** A Medium-style feed row: author line, title + summary with a thumbnail, then a quiet meta row. */
export function ProjectCard({ project }: { project: ProjectWithAuthor }) {
  const href = projectHref(project.author.username, project.slug);
  const authorName = project.author.full_name || project.author.username;

  return (
    <article className="border-b border-line py-8 first:pt-2">
      <Link href={`/${project.author.username}`} className="mb-3 flex w-max max-w-full items-center gap-2 text-[13px] hover:underline">
        <AuthorAvatar name={authorName} url={project.author.avatar_url} size={20} />
        <span className="truncate">{authorName}</span>
        {project.feature_section && <span className="shrink-0 text-muted">in Discoveries</span>}
      </Link>

      <div className="flex gap-6 sm:gap-12">
        <div className="min-w-0 flex-1">
          <Link href={href} className="block">
            <h2 className="text-xl leading-tight font-extrabold tracking-tight sm:text-[1.6rem]">{project.title}</h2>
            {project.summary && <p className="mt-2 line-clamp-2 text-muted">{project.summary}</p>}
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-muted">
            {/* Medium's star for stories the editors featured. */}
            {project.featured_at && (
              <span className="text-success" title="Featured by Identify" aria-label="Featured">
                ✦
              </span>
            )}
            <span>{formatDate(project.published_at)}</span>
            <span>{readingMinutes(project.body_md)} min read</span>
            {project.like_count > 0 && (
              <span className="flex items-center gap-1" title="Likes">
                <HeartIcon size={17} /> {project.like_count}
              </span>
            )}
            {project.comment_count > 0 && (
              <Link href={`${href}#responses`} className="flex items-center gap-1 hover:text-foreground" title="Responses">
                <CommentIcon size={17} /> {project.comment_count}
              </Link>
            )}
            {project.tags[0] && (
              <span className="hidden sm:inline">
                <TagLink tag={project.tags[0]} small />
              </span>
            )}
          </div>
        </div>
        {project.cover_url && (
          <Link href={href} className="shrink-0 self-center" tabIndex={-1} aria-hidden>
            <RemoteImage src={project.cover_url} sizes="(max-width: 640px) 80px, 160px" className="aspect-[3/2] w-20 object-cover sm:w-40" />
          </Link>
        )}
      </div>
    </article>
  );
}
