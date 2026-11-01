import type { ExtractedCv } from "./cv-shape";

/**
 * Free, offline CV parser used when no AI provider is configured (or all fail).
 * Heuristic: finds section headings, contact details and date ranges.
 * Works well on conventional CVs; the user always reviews the result before saving.
 */

type Section = "header" | "summary" | "experience" | "education" | "skills" | "tools" | "other";

const HEADINGS: [Section, RegExp][] = [
  ["summary", /^(profile|summary|professional summary|career summary|about|about me|objective|career objective|personal statement)$/],
  ["experience", /^(experience|work experience|professional experience|relevant experience|employment|employment history|work history|career history)$/],
  ["education", /^(education|education (and|&) (training|certifications?)|certifications?|certificates|academic background|qualifications|courses)$/],
  ["skills", /^(skills|technical skills|core skills|key skills|skills (and|&) (abilities|competencies)|competencies|core competencies|expertise)$/],
  ["tools", /^(tools|tools (and|&) technologies|technologies|tech stack|technical stack|languages (and|&) tools|software)$/],
  ["other", /^(projects|personal projects|interests|hobbies|references|languages|awards|achievements|honou?rs|publications|volunteering|volunteer experience|activities|leadership|links in document)$/],
];

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const POINT = `(?:${MONTH}\\s+)?(?:(?:0?[1-9]|1[0-2])\\/)?(?:19|20)\\d{2}`;
const DATE_RANGE = new RegExp(`(${POINT})\\s*(?:-|–|—|to|until)\\s*(${POINT}|present|current|now|date|ongoing)`, "i");
const SINGLE_YEAR = /\b(19|20)\d{2}\b/;
const BULLET = /^\s*(?:[-•*▪◦●·‣➢►✓]|\d+[.)])\s+/;
const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/;
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/;
const URL = /\b((?:https?:\/\/)?(?:www\.)?[\w-]+(?:\.[\w-]+)+(?:\/[^\s,;)]*)?)/gi;

/** Display names for tool detection when a CV has no explicit tools section. */
const KNOWN_TOOLS = [
  "Python", "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "Vue", "Angular", "Svelte", "Tailwind CSS",
  "HTML", "CSS", "Django", "Flask", "FastAPI", "Express", "Spring", "Java", "Kotlin", "Swift", "Go", "Rust", "C++",
  "C#", ".NET", "PHP", "Laravel", "Ruby", "Rails", "Flutter", "Dart", "PostgreSQL", "MySQL", "MongoDB", "Redis",
  "SQLite", "Supabase", "Firebase", "Docker", "Kubernetes", "AWS", "Azure", "GCP", "Terraform", "Linux", "Git",
  "GitHub", "GraphQL", "TensorFlow", "PyTorch", "scikit-learn", "Pandas", "NumPy", "LangChain", "LangGraph",
  "Tableau", "Power BI", "Excel", "Figma", "n8n", "Kafka", "Spark", "Airflow",
];

function headingOf(line: string): Section | null {
  const t = line.toLowerCase().replace(/[:|]+$/, "").replace(/[^a-z&\s]/g, " ").replace(/\s+/g, " ").trim();
  if (!t || t.length > 40) return null;
  for (const [section, re] of HEADINGS) if (re.test(t)) return section;
  return null;
}

/** Splits "a, b (c, d); e" on separators that are not inside brackets. */
function splitTopLevel(line: string) {
  const items: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of line) {
    if (ch === "(" || ch === "[") depth++;
    if ((ch === ")" || ch === "]") && depth > 0) depth--;
    if (depth === 0 && /[,;•|·]/.test(ch)) {
      items.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  items.push(current);
  return items;
}

function splitItems(lines: string[]) {
  return mergeWrapped(lines.filter(Boolean))
    .flatMap((l) => splitTopLevel(l.replace(BULLET, "")))
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter((s) => s.length >= 2 && s.length <= 80);
}

/** "Role at Company", "Role | Company | Lagos", "Company — Role", "Role, Company". */
function splitTitle(title: string) {
  const at = title.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
  if (at) return { role: at[1], company: at[2], location: "" };
  const parts = title.split(/\s+[|–—/-]\s+|\s*,\s+/).map((p) => p.trim()).filter(Boolean);
  return { role: parts[0] ?? "", company: parts[1] ?? "", location: parts.slice(2).join(", ") };
}

const trimSeparators = (s: string) => s.replace(/[\s|,()–—-]+$|^[\s|,()–—-]+/g, "").trim();

/** A short line that names a role/company rather than describing work. */
function isTitleLike(line: string) {
  return !BULLET.test(line) && line.length <= 100 && !/[.;:]$/.test(line);
}

/** Joins lines that a PDF wrapped mid-sentence ("real-" + "world", or a lowercase continuation). */
function mergeWrapped(lines: string[]) {
  const out: string[] = [];
  for (const line of lines) {
    const prev = out[out.length - 1];
    if (prev !== undefined && !BULLET.test(line) && (/-$/.test(prev) || (/^[a-z(]/.test(line) && !/[.!?]$/.test(prev)))) {
      out[out.length - 1] = /-$/.test(prev) ? prev + line : `${prev} ${line}`;
    } else {
      out.push(line);
    }
  }
  return out;
}

/**
 * Date ranges anchor each role: the short lines just above (or on) a date line are its title,
 * and everything after it, up to the next role's title, are highlights. This works even when
 * the PDF dropped the bullet symbols.
 */
function parseExperience(rawLines: string[]): ExtractedCv["experience"] {
  const lines = rawLines.map((l) => l.trim()).filter(Boolean);
  const anchors = lines.map((l, i) => (DATE_RANGE.test(l) ? i : -1)).filter((i) => i >= 0);
  if (!anchors.length) return [];

  const titleStart: number[] = anchors.map((a, k) => {
    const floor = k === 0 ? 0 : anchors[k - 1] + 1;
    const rest = trimSeparators(lines[a].replace(DATE_RANGE, ""));
    let start = a;
    // Up to two title lines directly above the date (none if the date line already carries the title + 1 above).
    const maxAbove = rest ? 1 : 2;
    while (start > floor && a - start < maxAbove && isTitleLike(lines[start - 1])) start--;
    return start;
  });

  return anchors.map((a, k) => {
    const date = lines[a].match(DATE_RANGE)!;
    const rest = trimSeparators(lines[a].replace(date[0], ""));
    const titles = [...lines.slice(titleStart[k], a), ...(rest ? [rest] : [])];
    const end = k + 1 < anchors.length ? titleStart[k + 1] : lines.length;
    const highlights = mergeWrapped(lines.slice(a + 1, end)).map((h) => h.replace(BULLET, ""));

    const first = splitTitle(titles[0] ?? "");
    const job =
      titles[1] && !first.company
        ? // Two title lines usually means "Role" then "Company, City".
          (() => {
            const second = splitTitle(titles[1]);
            return { role: first.role, company: second.role, location: second.company };
          })()
        : first;
    return { ...job, period: `${date[1]} - ${date[2]}`, highlights };
  });
}

function parseEducation(lines: string[]): ExtractedCv["education"] {
  const out: ExtractedCv["education"] = [];
  for (const raw of lines) {
    const line = raw.replace(BULLET, "").trim();
    if (!line) continue;
    const range = line.match(DATE_RANGE);
    const year = range ? null : line.match(SINGLE_YEAR);
    const meta = range ? `${range[1]} - ${range[2]}` : year ? year[0] : "";
    const title = (range ? line.replace(range[0], "") : year ? line.replace(year[0], "") : line)
      .replace(/[\s|,()–—-]+$|^[\s|,()–—-]+/g, "")
      .trim();
    if (!title && meta && out.length && !out[out.length - 1].meta) {
      out[out.length - 1].meta = meta; // a date on its own line belongs to the entry above
    } else if (title) {
      const prev = out[out.length - 1];
      // A short line under a degree with no date yet is usually the institution.
      if (prev && !prev.meta && !meta && title.length < 70 && !/degree|b\.?sc|m\.?sc|bachelor|master|phd|diploma|certificat/i.test(title)) {
        prev.title = `${prev.title} - ${title}`;
      } else {
        out.push({ title, meta });
      }
    }
  }
  return out;
}

export function ruleParseCv(text: string): ExtractedCv {
  const lines = text.split("\n").map((l) => l.trim());
  const sections: Record<Section, string[]> = { header: [], summary: [], experience: [], education: [], skills: [], tools: [], other: [] };
  let current: Section = "header";
  for (const line of lines) {
    const heading = headingOf(line);
    if (heading) current = heading;
    else sections[current].push(line);
  }

  // Contact details can be anywhere (often in a sidebar or footer).
  const email = text.match(EMAIL)?.[0] ?? "";
  const phone = (text.replace(EMAIL, "").match(PHONE)?.[1] ?? "").trim();
  const urls = [...text.matchAll(URL)].map((m) => m[1]).filter((u) => !u.includes("@") && !/\.(pdf|docx?)$/i.test(u));
  const linkedin = urls.find((u) => /linkedin\.com\/in\//i.test(u)) ?? "";
  const github = urls.find((u) => /github\.com\/[\w-]+/i.test(u)) ?? "";
  const website = urls.find((u) => /^https?:\/\//i.test(u) && !/linkedin|github|google|mailto/i.test(u)) ?? "";

  // Name and headline: the first plain lines of the header that aren't contact info.
  const headerLines = sections.header.filter(
    (l) => l && !EMAIL.test(l) && !/\d{5,}/.test(l.replace(/\s/g, "")) && !/https?:|www\.|linkedin|github/i.test(l),
  );
  const nameLine = headerLines.find((l) => /^[\p{L}'.-]+(\s+[\p{L}'.-]+){1,4}$/u.test(l)) ?? headerLines[0] ?? "";
  const afterName = headerLines.slice(headerLines.indexOf(nameLine) + 1);
  const location = afterName.find((l) => /^[\p{L}\s.-]+,\s*[\p{L}\s.-]+$/u.test(l) && l.length < 60) ?? "";
  const headline = afterName.find((l) => l !== location && l.length <= 120 && !/[.!?]$/.test(l)) ?? "";
  // Some CVs open with a paragraph instead of a "Summary" heading.
  const leadParagraph = afterName.filter((l) => l.length > 120).join(" ");

  const skills = splitItems(sections.skills.filter(Boolean));
  const explicitTools = splitItems(sections.tools.filter(Boolean));
  const lower = text.toLowerCase();
  const detectedTools = KNOWN_TOOLS.filter((t) =>
    new RegExp(`(^|[^a-z0-9])${t.toLowerCase().replace(/[.+#]/g, "\\$&")}([^a-z0-9]|$)`).test(lower),
  );

  return {
    full_name: nameLine,
    headline,
    location,
    summary: mergeWrapped(sections.summary.filter(Boolean)).join(" ") || leadParagraph,
    skills,
    tools: explicitTools.length ? explicitTools : detectedTools,
    experience: parseExperience(sections.experience),
    education: parseEducation(sections.education),
    links: { email, phone, linkedin, github, website },
  };
}
