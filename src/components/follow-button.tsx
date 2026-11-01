"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { toggleFollow } from "@/lib/social-actions";

type Props = {
  profileId: string;
  following: boolean;
  followers: number;
  signedIn: boolean;
  loginHref: string;
  /** Just the pill, without the follower count (sidebar lists). */
  compact?: boolean;
};

export function FollowButton({ profileId, following, followers, signedIn, loginHref, compact = false }: Props) {
  const [optimistic, setOptimistic] = useOptimistic({ following, followers }, (state, next: boolean) => ({
    following: next,
    followers: state.followers + (next ? 1 : -1),
  }));
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const className =
    "shrink-0 rounded-full border px-4 py-1.5 text-sm transition " +
    (compact
      ? optimistic.following
        ? "border-line text-muted"
        : "border-foreground hover:bg-surface"
      : optimistic.following
        ? "border-foreground"
        : "border-foreground bg-foreground text-background hover:opacity-90");
  const count = (
    <span className="text-muted">
      <strong className="text-foreground">{optimistic.followers}</strong> {optimistic.followers === 1 ? "follower" : "followers"}
    </span>
  );

  return (
    <span className="inline-flex items-center gap-3">
      {signedIn ? (
        <button
          type="button"
          aria-pressed={optimistic.following}
          disabled={pending}
          className={className}
          onClick={() =>
            startTransition(async () => {
              setError("");
              setOptimistic(!optimistic.following);
              const result = await toggleFollow(profileId);
              if (result.error) setError(result.error);
            })
          }
        >
          {optimistic.following ? "Following" : "Follow"}
        </button>
      ) : (
        <Link href={loginHref} className={className}>
          Follow
        </Link>
      )}
      {!compact && count}
      {error &&<span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
