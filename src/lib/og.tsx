import { ICON_SVG } from "@/components/logo";
import { SITE_NAME } from "@/lib/site";

/**
 * Shared pieces for link-preview cards (opengraph-image.tsx files): the size every platform
 * expects, brand colours, and image loading. Cards are drawn by next/og, which only accepts
 * inline styles and needs `display: flex` on any element with more than one child.
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

export const OG = {
  ink: "#111827",
  muted: "#6b7280",
  paper: "#ffffff",
  lime: "#a3ef6b",
  limeDeep: "#5fbf2e",
};

const ICON_DATA_URL = `data:image/svg+xml;base64,${Buffer.from(ICON_SVG).toString("base64")}`;

/** Logo tile + "Identify", for the corner of every card. */
export function OgBrand({ caption }: { caption?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- next/og draws plain <img> */}
      <img src={ICON_DATA_URL} width={56} height={56} alt="" />
      <div style={{ display: "flex", flexDirection: "column" }}>
        <span style={{ fontSize: 30, fontWeight: 700, color: OG.ink }}>{SITE_NAME}</span>
        {caption && <span style={{ fontSize: 22, color: OG.muted }}>{caption}</span>}
      </div>
    </div>
  );
}

/**
 * An image as a data URL the card renderer can draw (PNG, JPEG or GIF; it can't draw WebP), or
 * null, so a card falls back to its text-only layout instead of failing.
 */
export async function ogImage(url: string | null | undefined) {
  if (!url || !/^https:\/\//.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    const type = (res.headers.get("content-type") ?? "").split(";")[0];
    if (!res.ok || !["image/png", "image/jpeg", "image/gif"].includes(type)) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    if (bytes.byteLength > 4 * 1024 * 1024) return null;
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

type OgFont = { name: string; data: ArrayBuffer; weight: 400 | 700; style: "normal" };
let fonts: Promise<OgFont[]> | null = null;

/**
 * Geist (the site's font) in regular and bold, from Google Fonts. The card renderer's built-in
 * font has no bold. Loaded once per server instance; on failure cards use the built-in font.
 */
export function ogFonts() {
  fonts ??= Promise.all(
    ([400, 700] as const).map(async (weight) => {
      // Without a browser user agent, Google Fonts serves TTF, which the renderer can read (it can't read WOFF2).
      const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Geist:wght@${weight}`, { signal: AbortSignal.timeout(5000) })).text();
      const url = css.match(/src: url\((https:[^)]+)\) format\('(?:truetype|opentype)'\)/)?.[1];
      if (!url) throw new Error("no TTF in Google Fonts response");
      const data = await (await fetch(url, { signal: AbortSignal.timeout(5000) })).arrayBuffer();
      return { name: "Geist", data, weight, style: "normal" as const };
    }),
  ).catch((error) => {
    console.error("[og.fonts]", error instanceof Error ? error.message : error);
    fonts = null; // try again next time
    return [];
  });
  return fonts;
}

/** Options for every ImageResponse: the card size plus the Geist fonts when available. */
export async function ogOptions() {
  const loaded = await ogFonts();
  return { ...OG_SIZE, ...(loaded.length ? { fonts: loaded } : {}) };
}

/** Cuts text to fit a card, on a word boundary. */
export function clipText(text: string, max: number) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).replace(/\s+\S*$/, "")}…`;
}
