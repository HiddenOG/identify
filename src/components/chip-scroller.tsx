"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const Chevron = ({ left }: { left?: boolean }) => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
    <path d={left ? "M12.5 4.5 7 10l5.5 5.5" : "M7.5 4.5 13 10l-5.5 5.5"} />
  </svg>
);

/**
 * A horizontal row of chips with Medium-style arrows: each arrow shows only when there is more
 * to see in that direction, and the row fades out under it.
 */
export function ChipScroller({ children, label }: { children: ReactNode; label: string }) {
  const row = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  useEffect(() => {
    const el = row.current;
    if (!el) return;
    const update = () =>
      setEdges({ start: el.scrollLeft <= 1, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 1 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const scroll = (dir: 1 | -1) => {
    const el = row.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" });
  };

  const arrow = "absolute top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full text-muted hover:text-foreground";

  return (
    <div className="relative">
      <nav
        ref={row}
        aria-label={label}
        className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{
          // Fade the row under whichever arrows are showing.
          maskImage: `linear-gradient(to right, ${edges.start ? "#000" : "transparent"}, #000 48px, #000 calc(100% - 48px), ${edges.end ? "#000" : "transparent"})`,
        }}
      >
        {children}
      </nav>
      {!edges.start && (
        <button type="button" aria-label="Scroll left" onClick={() => scroll(-1)} className={`${arrow} -left-2`}>
          <Chevron left />
        </button>
      )}
      {!edges.end && (
        <button type="button" aria-label="Scroll right" onClick={() => scroll(1)} className={`${arrow} -right-2`}>
          <Chevron />
        </button>
      )}
    </div>
  );
}
