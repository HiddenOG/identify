/**
 * Builds a project draft from a public GitHub repo using GitHub's free REST API (no AI).
 * Set GITHUB_TOKEN to raise the anonymous rate limit (60 requests/hour per server IP).
 */

export type GithubDraft = {
  title: string;
  summary: string;
  body_md: string;
  cover_url: string;
  demo_url: string;
  repo_url: string;
  tags: string[];
  /** The README was a framework starter template, so the body is a fresh write-up outline instead. */
  starterReadme: string | null;
};

export class GithubImportError extends Error {}

const REPO_PATTERN =
  /^(?:https?:\/\/)?(?:www\.)?github\.com\/([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?(?:[/?#].*)?$/;
const SHORT_PATTERN = /^([A-Za-z0-9](?:[A-Za-z0-9-]{0,38}))\/([A-Za-z0-9._-]{1,100})$/;

export function parseRepoUrl(input: string) {
  const value = input.trim();
  const match = value.match(REPO_PATTERN) ?? value.match(SHORT_PATTERN);
  if (!match) return null;
  return { owner: match[1], repo: match[2] };
}

async function github(path: string, accept: string) {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": "identify",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  return fetch(`https://api.github.com${path}`, { headers, signal: AbortSignal.timeout(15_000), cache: "no-store" });
}

function humanize(repo: string) {
  return repo.replace(/[-_.]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
}

/** Points relative README links/images at GitHub so they work on our site; converts <img> tags to Markdown. */
function rewriteReadme(md: string, owner: string, repo: string, branch: string) {
  const raw = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/`;
  const blob = `https://github.com/${owner}/${repo}/blob/${branch}/`;
  const isRelative = (url: string) => !/^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(url);
  const resolve = (base: string, url: string) => base + url.replace(/^\.?\//, "");

  return md
    .replace(/<img\b[^>]*?\bsrc=["']([^"']+)["'][^>]*?(?:\balt=["']([^"']*)["'])?[^>]*>/gi, (_, src: string, alt = "") => {
      const url = isRelative(src) ? resolve(raw, src) : src;
      return `![${alt}](${url})`;
    })
    .replace(/(!?)\[([^\]]*)\]\(([^)\s]+)((?:\s+"[^"]*")?)\)/g, (whole, bang: string, text: string, url: string, title: string) => {
      if (!isRelative(url)) return whole;
      return `${bang}[${text}](${resolve(bang ? raw : blob, url)}${title})`;
    });
}

/** Default READMEs that come with project generators: they describe the template, not the project. */
const STARTER_READMES: [string, RegExp][] = [
  ["Next.js", /bootstrapped with \[`?create-next-app`?\]/i],
  ["Create React App", /bootstrapped with \[Create React App\]|Getting Started with Create React App/i],
  ["Vite", /This template provides a minimal setup to get React working in Vite|# Vue 3 \+ (?:TypeScript \+ )?Vite/i],
  ["Expo", /This is an \[Expo\]\(https:\/\/expo\.dev\) project created with/i],
];

/** Dependencies worth showing as tags, mapped to their topic names (see lib/topics.ts). */
const KNOWN_PACKAGES: Record<string, string> = {
  next: "Next.js", react: "React", vue: "Vue", nuxt: "Nuxt", svelte: "Svelte", "@sveltejs/kit": "SvelteKit",
  "@angular/core": "Angular", "react-native": "React Native", expo: "Expo", express: "Express", "@nestjs/core": "NestJS",
  tailwindcss: "Tailwind CSS", "@supabase/supabase-js": "Supabase", firebase: "Firebase", prisma: "Prisma",
  "drizzle-orm": "Drizzle", mongoose: "MongoDB", pg: "PostgreSQL", redis: "Redis", "socket.io": "Socket.IO",
  three: "Three.js", gsap: "GSAP", "framer-motion": "Framer Motion", electron: "Electron", openai: "OpenAI",
  "@anthropic-ai/sdk": "Anthropic", langchain: "LangChain", "@langchain/core": "LangChain", stripe: "Stripe",
  fastapi: "FastAPI", django: "Django", flask: "Flask", pandas: "Pandas", numpy: "NumPy", "scikit-learn": "scikit-learn",
  torch: "PyTorch", tensorflow: "TensorFlow", langgraph: "LangGraph", streamlit: "Streamlit", sqlalchemy: "SQLAlchemy",
  "python-telegram-bot": "Telegram", celery: "Celery", plotly: "Plotly", matplotlib: "Matplotlib",
};

/** Tag slug, matching how project tags are stored ("Next.js" → "next.js", "Tailwind CSS" → "tailwind-css"). */
const tagSlug = (name: string) => name.toLowerCase().replace(/\s+/g, "-");

/** Index of the first line in `lines` that isn't inside a ``` or ~~~ code block and matches `test`. */
function firstOutsideCode(lines: string[], test: (line: string) => boolean, maxLine = lines.length) {
  let fence: string | null = null;
  for (let i = 0; i < Math.min(lines.length, maxLine); i++) {
    const marker = lines[i].match(/^\s*(```|~~~)/)?.[1];
    if (marker) {
      fence = fence === null ? marker : fence === marker ? null : fence;
      continue;
    }
    if (fence === null && test(lines[i])) return i;
  }
  return -1;
}

/** The README's own title: a top-level heading near the start, never a "# comment" inside a code block. */
function readmeTitle(md: string) {
  const lines = md.split("\n");
  const atx = firstOutsideCode(lines, (l) => /^#\s+\S/.test(l), 15);
  if (atx >= 0) return { index: atx, span: 1, text: lines[atx].replace(/^#\s+/, "").replace(/\s*#+\s*$/, "") };
  // Setext style: "Title" underlined with "===".
  const setext = firstOutsideCode(lines, (l) => /^=+\s*$/.test(l), 15);
  if (setext > 0 && lines[setext - 1].trim()) return { index: setext - 1, span: 2, text: lines[setext - 1].trim() };
  return null;
}

/** First real paragraph of prose (no headings, badges, images, lists or code), trimmed to fit a summary. */
function firstParagraph(md: string) {
  const withoutCode = md.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, "");
  for (const block of withoutCode.split(/\n\s*\n/)) {
    const text = block.trim();
    if (!text || /^(#|!\[|\[!\[|<|[-*+>|_]|\d+\.)/.test(text)) continue;
    const plain = text
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/[*_`]/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (plain.length < 30) continue;
    if (plain.length <= 280) return plain;
    // End on a full sentence when one fits; otherwise cut at a word and mark it.
    const cut = plain.slice(0, 280);
    const sentenceEnd = cut.lastIndexOf(". ");
    return sentenceEnd > 120 ? cut.slice(0, sentenceEnd + 1) : `${cut.slice(0, cut.lastIndexOf(" "))}…`;
  }
  return "";
}

/** First screenshot-like image in the README (skips badges and icons), for the cover. */
function firstScreenshot(md: string) {
  for (const [, url] of md.matchAll(/!\[[^\]]*\]\(([^)\s]+)/g)) {
    if (/shields\.io|badge|badgen|\.svg(\?|$)|icon|logo|avatar/i.test(url)) continue;
    if (/^https?:\/\//i.test(url)) return url;
  }
  return null;
}

const MANIFESTS = /(^|\/)(package\.json|requirements\.txt|pyproject\.toml)$/;
const MAX_MANIFESTS = 4;

/**
 * Framework and library names from package.json / requirements.txt / pyproject.toml, at the root
 * or one folder down (monorepos keep them in backend/, frontend/ and so on). One tree call finds them.
 */
async function detectStack(owner: string, repo: string, branch: string) {
  const treeRes = await github(`/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`, "application/vnd.github+json");
  if (!treeRes.ok) return [];
  const tree = (await treeRes.json()) as { tree?: { path: string; type: string }[] };
  const manifests = (tree.tree ?? [])
    .filter((f) => f.type === "blob" && MANIFESTS.test(f.path) && f.path.split("/").length <= 2 && !f.path.includes("node_modules"))
    .sort((a, b) => a.path.split("/").length - b.path.split("/").length) // root files first
    .slice(0, MAX_MANIFESTS);

  const files = await Promise.all(
    manifests.map(async (f) => {
      const res = await github(`/repos/${owner}/${repo}/contents/${encodeURI(f.path)}`, "application/vnd.github.raw");
      return { path: f.path, text: res.ok ? await res.text() : "" };
    }),
  );

  const names = new Set<string>();
  for (const { path, text } of files) {
    if (path.endsWith("package.json")) {
      try {
        const json = JSON.parse(text) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
        for (const dep of Object.keys({ ...json.dependencies, ...json.devDependencies })) names.add(dep);
      } catch {
        // Not valid JSON: ignore.
      }
    } else {
      for (const line of text.split("\n")) {
        const dep = line.trim().match(/^["']?([A-Za-z0-9_.-]+)/)?.[1]?.toLowerCase();
        if (dep) names.add(dep);
      }
    }
  }
  // Drop duplicates (e.g. two LangChain packages map to one name).
  return [...new Set([...names].flatMap((n) => (KNOWN_PACKAGES[n] ? [KNOWN_PACKAGES[n]] : [])))];
}

/** A write-up outline to start from when the repo has no README worth importing. */
function outline(stack: string[], demoUrl: string) {
  return [
    "## What it does",
    "_What problem does it solve, and for whom?_",
    "",
    "## How it works",
    "_Architecture, key decisions, trade-offs. Screenshots help._",
    "",
    "## Tech stack",
    stack.length ? stack.map((s) => `- ${s}`).join("\n") : "- ",
    "",
    "## What I learned",
    "_What was hard, and what would you do differently?_",
    ...(demoUrl ? ["", `[Try the live demo](${demoUrl})`] : []),
  ].join("\n");
}

export async function fetchGithubDraft(input: string): Promise<GithubDraft> {
  const parsed = parseRepoUrl(input);
  if (!parsed) throw new GithubImportError("Paste a GitHub repo link like https://github.com/you/project.");
  const { owner, repo } = parsed;

  const repoRes = await github(`/repos/${owner}/${repo}`, "application/vnd.github+json");
  if (repoRes.status === 404) throw new GithubImportError("Repo not found. Is it public?");
  if (repoRes.status === 403 || repoRes.status === 429) {
    throw new GithubImportError("GitHub's rate limit was hit. Try again in a few minutes.");
  }
  if (!repoRes.ok) throw new GithubImportError(`GitHub returned an error (${repoRes.status}).`);
  const info = (await repoRes.json()) as {
    name: string;
    description: string | null;
    homepage: string | null;
    html_url: string;
    language: string | null;
    topics?: string[];
    default_branch: string;
    private: boolean;
  };
  if (info.private) throw new GithubImportError("That repo is private.");

  const [readmeRes, stack] = await Promise.all([
    github(`/repos/${owner}/${repo}/readme`, "application/vnd.github.raw"),
    detectStack(owner, repo, info.default_branch),
  ]);
  const readme = readmeRes.ok ? await readmeRes.text() : "";
  const demoUrl = info.homepage && /^https?:\/\//i.test(info.homepage) ? info.homepage : "";
  const starterReadme = STARTER_READMES.find(([, re]) => re.test(readme))?.[0] ?? null;

  let title = humanize(info.name);
  let body = "";
  if (readme && !starterReadme) {
    // Use the README's own title and drop it from the body (the page shows the title already).
    const lines = readme.split("\n");
    const heading = readmeTitle(readme);
    if (heading) {
      title = heading.text.replace(/[*_`]/g, "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim() || title;
      lines.splice(heading.index, heading.span);
    }
    body = rewriteReadme(lines.join("\n"), owner, repo, info.default_branch).trim();
  }
  if (!body) body = outline(stack, demoUrl);

  // Repo topics first, then the main language, then detected libraries (8 tags max).
  const tags = [...(info.topics ?? []), ...(info.language ? [info.language] : []), ...stack]
    .map(tagSlug)
    .filter((t, i, all) => /^[a-z0-9+#.-]{1,30}$/.test(t) && all.indexOf(t) === i)
    .slice(0, 8);

  return {
    title: title.slice(0, 140),
    summary: (info.description || firstParagraph(body) || "").slice(0, 280),
    body_md: body.slice(0, 100_000),
    // A screenshot from the README if there is one, else GitHub's generated social card.
    cover_url: firstScreenshot(body) ?? `https://opengraph.githubassets.com/1/${owner}/${repo}`,
    demo_url: demoUrl,
    repo_url: info.html_url,
    tags,
    starterReadme,
  };
}
