// The AI path, for real: each CV goes through extractCvText → importCvText (the same chain the
// upload button uses) and is scored next to the free reader. USES YOUR AI KEYS: one request per
// CV (13 in total), paced for free tiers. Run it yourself, when you mean to:
//   npm run test:cv:ai                          (providers and order from AI_PROVIDERS in .env.local)
//   ONLY='^w' npm run test:cv:ai -- --verbose   (just the weird CVs, with what was read)
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { extractCvText, ImportError } from "../../src/lib/import/extract-text";
import { importCvText } from "../../src/lib/import/cv-import";
import { ruleParseCv } from "../../src/lib/import/rule-parser";
import { normalizeExtracted, type ImportedCv } from "../../src/lib/import/cv-shape";

const DIR = fileURLToPath(new URL(".", import.meta.url));
const PACE_MS = Number(process.env.PACE_MS ?? 8000);
const { FIXTURES } = await import(pathToFileURL(`${DIR}/fixtures.mjs`).href);
const { WEIRD } = await import(pathToFileURL(`${DIR}/weird.mjs`).href);

type Expect = { name: string; email: string; phone: boolean; jobs: number; schools: number; skills: number };
function score(r: ImportedCv, want: Expect) {
  const checks: [string, boolean, string][] = [
    ["name", r.basics.full_name.toLowerCase() === want.name.toLowerCase(), r.basics.full_name],
    ["email", r.cv.links.email === want.email, r.cv.links.email ?? ""],
    ["phone", Boolean(r.cv.links.phone) === want.phone, r.cv.links.phone ?? ""],
    ["jobs", r.cv.experience.length === want.jobs, `${r.cv.experience.length}/${want.jobs}`],
    ["schools", r.cv.education.length === want.schools, `${r.cv.education.length}/${want.schools}`],
    ["skills", r.cv.skills.length + r.cv.tools.length >= want.skills, `${r.cv.skills.length}+${r.cv.tools.length}`],
  ];
  return { ok: checks.filter((c) => c[1]).length, total: checks.length, misses: checks.filter((c) => !c[1]).map(([k, , v]) => `${k}✗(${v})`).join(" ") };
}

const cases = [
  ...readdirSync(`${DIR}/files`).sort().map((f) => ({
    file: `${DIR}/files/${f}`,
    label: f,
    want: FIXTURES.find((x: { id: string }) => f.startsWith(x.id) || (f.startsWith("11-") && x.id.startsWith("05-")))?.expect,
  })),
  ...WEIRD.map((w: { id: string; expect: Expect }) => ({ file: `${DIR}/weird-files/${w.id}.pdf`, label: `${w.id}.pdf`, want: w.expect })),
];

const totals = { ai: 0, rule: 0, max: 0, calls: 0 };
// ONLY=regex limits the run to some files, to keep the number of AI requests small.
const only = process.env.ONLY ? new RegExp(process.env.ONLY) : null;
for (const c of cases.filter((x) => !only || only.test(x.label))) {
  let text: string;
  try {
    text = await extractCvText(new File([readFileSync(c.file)], c.label));
  } catch (e) {
    console.log(`${c.label.padEnd(30)} skipped: ${e instanceof ImportError ? e.message : String(e)}`);
    continue;
  }
  const started = Date.now();
  const ai = await importCvText(text);
  totals.calls++;
  const rule = normalizeExtracted(ruleParseCv(text));
  const a = score(ai, c.want);
  const r = score(rule, c.want);
  totals.ai += a.ok;
  totals.rule += r.ok;
  totals.max += a.total;
  console.log(
    `${c.label.padEnd(30)} ${ai.source.padEnd(17)} AI ${a.ok}/${a.total}  free ${r.ok}/${r.total}  ${((Date.now() - started) / 1000).toFixed(1)}s` +
      (a.misses ? `  AI missed: ${a.misses}` : "") +
      (ai.notes.length ? `  [${ai.notes.join("; ")}]` : ""),
  );
  if (process.argv.includes("--verbose")) {
    console.log("   ", ai.basics.headline, "|", ai.basics.location);
    for (const j of ai.cv.experience) console.log("    job:", j.role, "@", j.company, "|", j.period, "|", j.highlights.length, "bullets");
    for (const e of ai.cv.education) console.log("    edu:", e.title, "|", e.meta);
    console.log("    skills:", [...ai.cv.skills, ...ai.cv.tools].join(", "));
  }
  await new Promise((r) => setTimeout(r, PACE_MS));
}
console.log(`\nAI: ${totals.ai}/${totals.max}   free reader: ${totals.rule}/${totals.max}   AI requests made: ${totals.calls}`);
