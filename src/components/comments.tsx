import Link from "next/link";
import { AuthorAvatar } from "@/components/author-avatar";
import { CommentForm } from "@/components/comment-form";
import { formatDate } from "@/lib/projects";
import { deleteComment } from "@/lib/social-actions";
import type { CommentWithAuthor } from "@/lib/social";

type Props = {
  projectId: string;
  projectOwnerId: string;
  comments: CommentWithAuthor[];
  userId: string | null;
  loginHref: string;
};

export function Comments({ projectId, projectOwnerId, comments, userId, loginHref }: Props) {
  return (
    <section id="responses" className="mt-12 border-t border-line pt-8">
      <h2 className="mb-6 text-xl font-semibold">Responses ({comments.length})</h2>

      {userId ? (
        <CommentForm projectId={projectId} />
      ) : (
        <p className="rounded-md bg-surface px-4 py-3 text-sm">
          <Link href={loginHref} className="font-medium underline">
            Sign in
          </Link>{" "}
          to respond.
        </p>
      )}

      <ul className="mt-8 space-y-6">
        {comments.map((c) => {
          const name = c.author.full_name || c.author.username;
          const canDelete = userId === c.author_id || userId === projectOwnerId;
          return (
            <li key={c.id} className="border-b border-line pb-6">
              <div className="mb-2 flex items-center gap-2 text-sm">
                <Link href={`/${c.author.username}`} className="flex items-center gap-2 hover:underline">
                  <AuthorAvatar name={name} url={c.author.avatar_url} size={28} />
                  <span className="font-medium">{name}</span>
                </Link>
                {c.author_id === projectOwnerId && (
                  <span className="rounded-full bg-brand px-2 py-0.5 text-xs font-medium text-brand-ink">Author</span>
                )}
                <span className="text-muted">· {formatDate(c.created_at)}</span>
                {canDelete && (
                  <form action={deleteComment} className="ml-auto">
                    <input type="hidden" name="id" value={c.id} />
                    <button className="text-xs text-muted hover:text-danger">Delete</button>
                  </form>
                )}
              </div>
              <p className="whitespace-pre-wrap break-words">{c.body}</p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
