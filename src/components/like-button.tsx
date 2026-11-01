"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { HeartIcon } from "@/components/icons";
import { toggleLike } from "@/lib/social-actions";

type Props = { projectId: string; liked: boolean; count: number; signedIn: boolean; loginHref: string };

export function LikeButton({ projectId, liked, count, signedIn, loginHref }: Props) {
  const [optimistic, setOptimistic] = useOptimistic({ liked, count }, (state, next: boolean) => ({
    liked: next,
    count: state.count + (next ? 1 : -1),
  }));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const className =
    "inline-flex items-center gap-1.5 text-sm transition " +
    (optimistic.liked ? "text-danger" : "text-muted hover:text-foreground");
  const label = (
    <>
      <HeartIcon filled={optimistic.liked} size={22} />
      {optimistic.count}
    </>
  );

  if (!signedIn) {
    return (
      <Link href={loginHref} className={className} title="Sign in to like">
        {label}
      </Link>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-pressed={optimistic.liked}
        aria-label={optimistic.liked ? "Unlike" : "Like"}
        disabled={pending}
        className={className}
        onClick={() =>
          startTransition(async () => {
            setError("");
            setOptimistic(!optimistic.liked);
            const result = await toggleLike(projectId);
            if (result.error) setError(result.error);
          })
        }
      >
        {label}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
