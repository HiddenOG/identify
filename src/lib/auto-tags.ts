import { ALL_TOPICS } from "@/lib/topics";

/**
 * Tags for a story nobody tagged, from what it says: Identify's topic list (lib/topics.ts) plus a
 * few broad tags, matched against the title, summary and body. No AI: plain word matching, so it's
 * free and predictable. Title and summary count three times as much as the body.
 */

type Rule = { tag: string; patterns: RegExp[] };

/** Short forms and phrasings people actually write, by tag. */
const ALIASES: Record<string, string[]> = {
  "machine-learning": ["machine learning", "ml model", "ml models"],
  llms: ["llm", "llms", "large language model", "large language models", "gpt", "chatgpt", "claude", "gemini"],
  "ai-agents": ["ai agent", "ai agents", "agentic", "agents"],
  rag: ["retrieval-augmented", "retrieval augmented"],
  "computer-vision": ["computer vision", "image recognition", "object detection"],
  "ui-design": ["ui design", "interface design", "user interface"],
  "ux-design": ["ux", "user experience"],
  "product-design": ["product design", "product designer"],
  "graphic-design": ["graphic design", "graphic designer"],
  "frontend-development": ["frontend", "front-end", "front end"],
  "backend-development": ["backend", "back-end", "back end", "api", "apis"],
  "full-stack-development": ["full-stack", "full stack", "fullstack"],
  "mobile-development": ["mobile app", "mobile apps", "ios app", "android app"],
  "open-source": ["open source", "open-source", "github repo"],
  "data-visualization": ["data visualization", "dashboard", "dashboards", "charts"],
  "e-commerce": ["e-commerce", "ecommerce", "online store"],
  fintech: ["fintech", "payments", "payment", "banking app"],
  "health-tech": ["health tech", "healthtech", "healthcare app"],
  edtech: ["edtech", "learning platform"],
  startups: ["startup", "startups", "founder", "founders"],
  automation: ["automation", "automate", "workflow", "workflows"],
  blockchain: ["blockchain", "web3", "crypto", "onchain", "on-chain", "defi"],
  "no-code": ["no-code", "no code", "low-code"],
  "3d-design": ["3d", "three.js", "webgl"],
  "motion-design": ["motion design", "animation", "animations"],
  "technical-writing": ["technical writing", "documentation"],
  // Broad tags outside the topic list.
  ai: ["ai", "artificial intelligence"],
  design: ["design", "designer", "designers"],
  "developer-tools": ["developer tools", "dev tools", "devtools", "code review", "ide"],
};

/** Words that mean something else in plain English: only counted as written, with the capital. */
const CASE_SENSITIVE = new Set(["go", "rust", "swift", "dart", "express", "spark", "rails", "excel", "adobe", "framer", "canva", "growth", "research", "sales", "strategy", "operations", "agile", "leadership", "tax", "biology", "physics", "chemistry", "medicine", "nursing", "teaching", "tutoring", "consulting", "freelancing", "logistics", "manufacturing", "procurement", "recruiting", "investing", "banking", "accounting", "auditing", "compliance", "contracts", "journalism", "blogging", "photography", "podcasting", "newsletters", "youtube", "linux", "git", "networking", "analytics", "statistics", "accessibility", "branding", "sustainability", "volunteering", "nonprofits"]);

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// Word edges that also work around "Next.js", "C++" and "C#".
const phrase = (s: string, flags: string) => new RegExp(`(?<![\\w+#.])${escape(s)}(?![\\w+#])`, flags);

const RULES: Rule[] = (() => {
  const rules = new Map<string, RegExp[]>();
  for (const t of ALL_TOPICS) {
    const exact = CASE_SENSITIVE.has(t.slug);
    rules.set(t.slug, [phrase(t.name, exact ? "g" : "gi")]);
  }
  for (const [tag, words] of Object.entries(ALIASES)) {
    rules.set(tag, [...(rules.get(tag) ?? []), ...words.map((w) => phrase(w, w === "ai" ? "g" : "gi"))]);
  }
  // "AI" in capitals only (so "said" or "ai" in a URL don't count).
  rules.set("ai", [phrase("AI", "g"), phrase("artificial intelligence", "gi")]);
  return [...rules].map(([tag, patterns]) => ({ tag, patterns }));
})();

const count = (text: string, patterns: RegExp[]) => patterns.reduce((n, re) => n + (text.match(re)?.length ?? 0), 0);

/** Up to `limit` tags, best first; only tags mentioned more than in passing. */
export function autoTags({ title, summary, body }: { title: string; summary?: string | null; body?: string | null }, limit = 5) {
  // Code blocks and links are noise (a URL path or a variable name isn't a topic).
  const prose = (body ?? "").replace(/```[\s\S]*?```/g, " ").replace(/`[^`]*`/g, " ").replace(/\]\([^)]*\)/g, "]").replace(/https?:\/\/\S+/g, " ");
  const head = `${title} ${summary ?? ""}`;
  return RULES.map(({ tag, patterns }) => ({ tag, score: 3 * count(head, patterns) + count(prose, patterns) }))
    .filter((t) => t.score >= 2)
    .sort((a, b) => b.score - a.score || a.tag.localeCompare(b.tag))
    .slice(0, limit)
    .map((t) => t.tag);
}
