"use client";

import { useState, type ReactNode } from "react";

/** A grid that shows `step` items, then a "Show more" button that reveals the next batch. */
export function ShowMore({ items, step = 12, className }: { items: ReactNode[]; step?: number; className?: string }) {
  const [shown, setShown] = useState(step);
  return (
    <>
      <div className={className}>{items.slice(0, shown)}</div>
      {shown < items.length && (
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => setShown((n) => n + step)}
            className="rounded-full border border-foreground px-6 py-2 text-sm hover:bg-surface"
          >
            Show more ({items.length - shown})
          </button>
        </div>
      )}
    </>
  );
}
