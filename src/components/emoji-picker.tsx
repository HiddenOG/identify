"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

type Emoji = { unicode: string; label: string; tags?: string[]; group?: number };
type RawEmoji = { emoji: string; label: string; tags?: string[]; group?: number; order?: number; version: number };

const MAX_EMOJI_VERSION = 14;

/** emojibase groups, in picker order (2 = skin-tone components, not shown on their own). */
const GROUPS = [
  { id: 0, label: "Smileys & emotion", icon: "😀" },
  { id: 1, label: "People & body", icon: "👋" },
  { id: 3, label: "Animals & nature", icon: "🐻" },
  { id: 4, label: "Food & drink", icon: "🍔" },
  { id: 6, label: "Activities", icon: "⚽" },
  { id: 5, label: "Travel & places", icon: "🚗" },
  { id: 7, label: "Objects", icon: "💡" },
  { id: 8, label: "Symbols", icon: "💯" },
  { id: 9, label: "Flags", icon: "🏳️" },
];

const RECENT_KEY = "identify-recent-emoji";
const RECENT_MAX = 16;
const DEFAULT_RECENT = ["👍", "😂", "❤️", "🙏", "🔥", "🎉", "👏", "😊"];

function readRecent(): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]");
    return Array.isArray(saved) && saved.length ? saved.slice(0, RECENT_MAX) : DEFAULT_RECENT;
  } catch {
    return DEFAULT_RECENT;
  }
}

// Keeps focus where it is (usually the message box), so a phone keyboard doesn't drop and pop
// back up on every tap.
const keepFocus = (e: PointerEvent) => e.preventDefault();

/**
 * A LinkedIn-style emoji picker: search, category tabs and recently used. The full emoji set
 * (~1,900, from emojibase) is downloaded only when the picker first opens.
 */
export function EmojiPicker({ onPick, onClose }: { onPick: (emoji: string) => void; onClose: () => void }) {
  const [all, setAll] = useState<Emoji[] | null>(null);
  const [query, setQuery] = useState("");
  // Only ever rendered after a tap (never on the server), so reading storage up front is safe.
  const [recent, setRecent] = useState<string[]>(readRecent);
  const [active, setActive] = useState<number | "recent">("recent");
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    import("emojibase-data/en/data.json").then((mod) => {
      const list = (mod.default as RawEmoji[])
        // Emoji 15+ still shows as an empty box on many phones and on Windows; skip those.
        .filter((e) => e.group !== undefined && e.group !== 2 && e.version <= MAX_EMOJI_VERSION)
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((e) => ({ unicode: e.emoji, label: e.label, tags: e.tags, group: e.group }));
      setAll(list);
    });
  }, []);

  function pick(emoji: string) {
    onPick(emoji);
    const next = [emoji, ...recent.filter((r) => r !== emoji)].slice(0, RECENT_MAX);
    setRecent(next);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // Private mode or blocked storage: recents just won't be remembered.
    }
  }

  function jump(id: number | "recent") {
    setQuery("");
    setActive(id);
    requestAnimationFrame(() => scroller.current?.querySelector(`[data-group="${id}"]`)?.scrollIntoView({ block: "start" }));
  }

  const q = query.trim().toLowerCase();
  const results = q && all ? all.filter((e) => e.label.toLowerCase().includes(q) || e.tags?.some((t) => t.toLowerCase().startsWith(q))).slice(0, 200) : null;

  const grid = (emojis: { unicode: string; label: string }[]) => (
    <div className="grid grid-cols-8 gap-0.5">
      {emojis.map((e) => (
        <button
          key={e.unicode}
          type="button"
          title={e.label}
          aria-label={e.label}
          onPointerDown={keepFocus}
          onClick={() => pick(e.unicode)}
          className="grid aspect-square place-items-center rounded-md text-[1.35rem] leading-none hover:bg-surface"
        >
          {e.unicode}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex h-[22rem] w-[min(22rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-xl border border-line bg-background shadow-[0_8px_30px_rgb(0_0_0/0.18)]">
      <div className="flex items-center gap-2 p-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search emoji"
          aria-label="Search emoji"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm outline-none focus:border-foreground"
        />
        <button type="button" onPointerDown={keepFocus} onClick={onClose} aria-label="Close emoji picker" className="grid size-8 place-items-center rounded-full text-muted hover:bg-surface hover:text-foreground">
          ✕
        </button>
      </div>

      <div className="flex border-y border-line bg-surface px-1">
        {[{ id: "recent" as const, label: "Recently used", icon: "🕘" }, ...GROUPS].map((g) => (
          <button
            key={g.id}
            type="button"
            title={g.label}
            aria-label={g.label}
            onPointerDown={keepFocus}
            onClick={() => jump(g.id)}
            className={`grid flex-1 place-items-center py-1.5 text-base ${active === g.id && !q ? "border-b-2 border-success" : "border-b-2 border-transparent opacity-70 hover:opacity-100"}`}
          >
            {g.icon}
          </button>
        ))}
      </div>

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto p-2">
        {results ? (
          results.length ? (
            grid(results)
          ) : (
            <p className="py-8 text-center text-sm text-muted">No emoji match “{query}”.</p>
          )
        ) : (
          <>
            <section data-group="recent">
              <h3 className="mb-1 text-xs font-semibold text-muted">Recently used</h3>
              {grid(recent.map((r) => ({ unicode: r, label: r })))}
            </section>
            {all === null ? (
              <p className="py-8 text-center text-sm text-muted">Loading emoji…</p>
            ) : (
              GROUPS.map((g) => (
                <section key={g.id} data-group={g.id} className="mt-3">
                  <h3 className="mb-1 text-xs font-semibold text-muted">{g.label}</h3>
                  {grid(all.filter((e) => e.group === g.id))}
                </section>
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
