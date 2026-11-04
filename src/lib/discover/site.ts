import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/**
 * Reads other people's websites for Discover: the preview details a site publishes for link
 * sharing (title, description, og:image) and, for claims, whether a verification code is on the
 * page. Only public http(s) hosts on the default ports; never private or local addresses, so a
 * submitted URL can't point the server at its own network. Honours robots.txt for listings.
 */

export const BOT_NAME = "IdentifyBot";
const USER_AGENT = `Mozilla/5.0 (compatible; ${BOT_NAME}/1.0)`;
const MAX_BYTES = 1_500_000;
const MAX_REDIRECTS = 4;
const TIMEOUT_MS = 10_000;

export class SiteError extends Error {}

/** https://example.com/path (no query, hash or trailing slash), or throws SiteError. */
export function normalizeUrl(input: string) {
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  } catch {
    throw new SiteError("That doesn't look like a web address.");
  }
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) {
    throw new SiteError("That doesn't look like a web address.");
  }
  if (url.port || url.username || url.password) throw new SiteError("Use a plain web address, without a port or login.");
  url.hash = "";
  url.search = "";
  url.hostname = url.hostname.toLowerCase();
  return url.toString().replace(/\/$/, "");
}

export function displayHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function isPrivateAddress(address: string) {
  const v4 = address.startsWith("::ffff:") ? address.slice(7) : address;
  if (isIP(v4) === 4) {
    const [a, b] = v4.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }
  const v6 = address.toLowerCase();
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

async function assertPublicHost(url: URL) {
  if (!["http:", "https:"].includes(url.protocol) || url.port) throw new SiteError("That site can't be reached.");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new SiteError("That site can't be reached.");
  }
  const addresses = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new SiteError("That site can't be found. Check the address.");
  if (addresses.some(({ address }) => isPrivateAddress(address))) throw new SiteError("That site can't be reached.");
}

/** GET with every redirect hop checked and a timeout. Returns the final response and its URL. */
async function safeFetch(start: string, accept: string) {
  let url = new URL(start);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url);
    const res = await fetch(url, {
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": USER_AGENT, accept },
    });
    const next = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && next) {
      url = new URL(next, url);
      continue;
    }
    return { res, url };
  }
  throw new SiteError("That site redirects too many times.");
}

/** Reads at most `max` bytes of a body; returns null if it's bigger (unless `truncate`). */
async function readCapped(res: Response, max: number, truncate: boolean) {
  if (!res.body) return new Uint8Array();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (size <= max) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    size += value.byteLength;
  }
  await reader.cancel().catch(() => {});
  if (size > max && !truncate) return null;
  return new Uint8Array(Buffer.concat(chunks).subarray(0, max));
}

/** A page's HTML (size-capped), its final URL and status. */
async function fetchText(start: string) {
  const { res, url } = await safeFetch(start, "text/html,text/plain;q=0.9,*/*;q=0.5");
  const bytes = (await readCapped(res, MAX_BYTES, true)) ?? new Uint8Array();
  return { url: url.toString(), status: res.status, text: new TextDecoder().decode(bytes) };
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

/** A preview image (PNG, JPEG, WebP or GIF up to 8 MB), or null if it can't be fetched. */
export async function fetchImage(src: string) {
  try {
    const { res } = await safeFetch(src, "image/webp,image/png,image/jpeg,image/*;q=0.8");
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    if (!res.ok || !IMAGE_TYPES[type]) return null;
    const bytes = await readCapped(res, MAX_IMAGE_BYTES, false);
    return bytes && bytes.byteLength > 0 ? { bytes, type, ext: IMAGE_TYPES[type] } : null;
  } catch {
    return null;
  }
}

/** Whether robots.txt lets IdentifyBot (or every bot) read `url`. A missing robots.txt allows it. */
async function robotsAllow(url: URL) {
  let text: string;
  try {
    const res = await fetchText(`${url.origin}/robots.txt`);
    if (res.status >= 400) return true;
    text = res.text;
  } catch {
    return true;
  }
  return robotsTxtAllows(text, url.pathname || "/");
}

/** The robots.txt rules for IdentifyBot (or "*") applied to `path`. Exported for tests. */
export function robotsTxtAllows(text: string, path: string) {
  // Group the rules by user-agent; use ours if listed, otherwise "*".
  const groups: { agents: string[]; rules: { allow: boolean; path: string }[] }[] = [];
  let current: (typeof groups)[number] | null = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const match = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!match) continue;
    const [, key, value] = match;
    const field = key.toLowerCase();
    if (field === "user-agent") {
      if (!current || !lastWasAgent) groups.push((current = { agents: [], rules: [] }));
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((field === "allow" || field === "disallow") && current) {
      if (value) current.rules.push({ allow: field === "allow", path: value });
      lastWasAgent = false;
    }
  }
  const ours = groups.find((g) => g.agents.includes(BOT_NAME.toLowerCase())) ?? groups.find((g) => g.agents.includes("*"));
  if (!ours) return true;

  // The longest matching rule wins; "*" is a wildcard and "$" anchors the end.
  let best: { allow: boolean; length: number } | null = null;
  for (const rule of ours.rules) {
    const anchored = rule.path.endsWith("$");
    const body = anchored ? rule.path.slice(0, -1) : rule.path;
    const pattern = new RegExp("^" + body.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + (anchored ? "$" : ""));
    if (pattern.test(path) && (!best || rule.path.length > best.length || (rule.path.length === best.length && rule.allow))) {
      best = { allow: rule.allow, length: rule.path.length };
    }
  }
  return best?.allow ?? true;
}

function decodeEntities(text: string) {
  return text
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** Exported for tests. */
export function readMeta(html: string) {
  const headEnd = html.search(/<\/head>/i);
  const head = headEnd > 0 ? html.slice(0, headEnd) : html;
  const meta = new Map<string, string>();
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = new Map<string, string>();
    for (const m of tag.matchAll(/([a-z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi)) {
      attrs.set(m[1].toLowerCase(), m[2] ?? m[3] ?? m[4] ?? "");
    }
    const key = (attrs.get("property") ?? attrs.get("name") ?? "").toLowerCase();
    const content = attrs.get("content");
    if (key && content && !meta.has(key)) meta.set(key, decodeEntities(content).trim());
  }
  const title = head.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1];
  return { meta, title: title ? decodeEntities(title).trim() : "" };
}

export type SitePreview = {
  url: string;
  name: string;
  description: string;
  imageUrl: string;
  /** An address the site publishes for contact (a mailto: link), or "". */
  email: string;
};

/**
 * The email a site publishes for contact: the first mailto: link that isn't an obvious
 * placeholder or a no-reply address. Only explicit mailto: links count, not any text that looks
 * like an email, so it's an address the person chose to publish.
 */
export function publishedEmail(html: string) {
  for (const [, raw] of html.matchAll(/href\s*=\s*["']mailto:([^"'?#]+)/gi)) {
    let email: string;
    try {
      email = decodeEntities(decodeURIComponent(raw)).trim().toLowerCase();
    } catch {
      continue; // badly encoded link
    }
    if (/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email) && !/example\.|yourname|your@|email@|noreply|no-reply/.test(email)) return email;
  }
  return "";
}

/** The preview details a site publishes for sharing. Throws SiteError if it can't or mustn't be read. */
export async function readSitePreview(input: string): Promise<SitePreview> {
  const url = normalizeUrl(input);
  if (!(await robotsAllow(new URL(url)))) {
    throw new SiteError("This site asks bots not to read it, so it can't be listed automatically.");
  }
  let page: Awaited<ReturnType<typeof fetchText>>;
  try {
    page = await fetchText(url);
  } catch (error) {
    if (error instanceof SiteError) throw error;
    throw new SiteError("That site didn't respond. Check the address and try again.");
  }
  if (page.status >= 400) throw new SiteError(`That site answered with an error (${page.status}).`);

  const { meta, title } = readMeta(page.text);
  // The page title before the site name: on hosts like GitHub or Behance the site name is the platform.
  // "Jane Doe | Product Designer" → "Jane Doe"
  const name = (meta.get("og:title") || title || meta.get("og:site_name") || "").split(/\s+[|·•–—-]\s+/)[0].trim().slice(0, 120);
  const description = (meta.get("og:description") ?? meta.get("description") ?? meta.get("twitter:description") ?? "").slice(0, 400);
  const image = meta.get("og:image") ?? meta.get("og:image:url") ?? meta.get("og:image:secure_url") ?? meta.get("twitter:image") ?? meta.get("twitter:image:src") ?? "";
  let imageUrl = "";
  try {
    const resolved = image ? new URL(image, page.url) : null;
    if (resolved && ["http:", "https:"].includes(resolved.protocol)) imageUrl = resolved.toString();
  } catch {}

  return { url, name: name || displayHost(url), description, imageUrl, email: publishedEmail(page.text) };
}

/** True when the site's home page contains `code` (in a meta tag or anywhere in the HTML). */
export async function siteContainsCode(url: string, code: string) {
  try {
    const page = await fetchText(url);
    return page.status < 400 && page.text.includes(code);
  } catch {
    return false;
  }
}
