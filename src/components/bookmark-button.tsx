"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { BookmarkIcon } from "@/components/icons";
import { toggleBookmark } from "@/lib/social-actions";

type Props = { projectId: string; saved: boolean; signedIn: boolean; loginHref: string };

/** Medium-style save-to-Library toggle. */
export function BookmarkButton({ projectId, saved, signedIn, loginHref }: Props) {
  const [optimistic, setOptimistic] = useOptimistic(saved);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const className = `inline-flex items-center transition ${optimistic ? "text-foreground" : "text-muted hover:text-foreground"}`;

  if (!signedIn) {
    return (
      <Link href={loginHref} className={className} title="Sign in to save" aria-label="Save to Library">
        <BookmarkIcon size={22} />
      </Link>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        aria-pressed={optimistic}
        aria-label={optimistic ? "Remove from Library" : "Save to Library"}
        title={optimistic ? "Saved to Library" : "Save to Library"}
        disabled={pending}
        className={className}
        onClick={() =>
          startTransition(async () => {
            setError("");
            setOptimistic(!optimistic);
            const result = await toggleBookmark(projectId);
            if (result.error) setError(result.error);
          })
        }
      >
        <BookmarkIcon size={22} filled={optimistic} />
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </span>
  );
}
