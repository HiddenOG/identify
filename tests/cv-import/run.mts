// Runs every test CV through the real upload path (extractCvText) and the free rule parser,
// then scores it against what the fixture says a good import finds. No AI is called.
// Run from the project root: npm run test:cv
//   (add --verbose to see what was read from each CV)
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { extractCvText, ImportError } from "../../src/lib/import/extract-text";
import { ruleParseCv } from "../../src/lib/import/rule-parser";
import { normalizeExtracted } from "../../src/lib/import/cv-shape";

const DIR = fileURLToPath(new URL(".", import.meta.url));
const verbose = process.argv.includes("--verbose");
const { FIXTURES } = await import(pathToFileURL(`${DIR}/fixtures.mjs`).href);
const expectFor = (file: string) => FIXTURES.find((f: { id: string }) => file.startsWith(f.id) || (file.startsWith("11-") && f.id.startsWith("05-")))?.expect;

let total = 0;
let got = 0;
for (const file of readdirSync(`${DIR}/files`).sort()) {
  const bytes = readFileSync(`${DIR}/files/${file}`);
  const upload = new File([bytes], file);
  let text: string;
  try {
    text = await extractCvText(upload);
  } catch (e) {
    // Only the scanned (image-only) PDF should be refused; anything else counts as a failure.
    const expected = e instanceof ImportError && file.includes("scanned");
    if (!expected) total++;
    console.log(`${file.padEnd(30)} ${expected ? "REFUSED as expected: " : "FAILED: "}${(e as Error).message}`);
    continue;
  }
  const { basics, cv } = normalizeExtracted(ruleParseCv(text));
  const want = expectFor(file);
  const checks: [string, boolean, string][] = [
    ["name", basics.full_name.toLowerCase() === want.name.toLowerCase(), basics.full_name],
    ["email", cv.links.email === want.email, cv.links.email ?? ""],
    ["phone", Boolean(cv.links.phone) === want.phone, cv.links.phone ?? ""],
    ["jobs", cv.experience.length === want.jobs, `${cv.experience.length}/${want.jobs}`],
    ["schools", cv.education.length === want.schools, `${cv.education.length}/${want.schools}`],
    ["skills", cv.skills.length + cv.tools.length >= want.skills, `${cv.skills.length}+${cv.tools.length}`],
  ];
  const ok = checks.filter((c) => c[1]).length;
  total += checks.length;
  got += ok;
  console.log(`${file.padEnd(30)} ${ok}/${checks.length}  ${checks.filter((c) => !c[1]).map(([k, , v]) => `${k}✗(${v})`).join(" ")}`);
  if (verbose) {
    console.log("   headline:", basics.headline, "| location:", basics.location, "| summary:", cv.summary.slice(0, 60));
    for (const j of cv.experience) console.log("   job:", JSON.stringify({ role: j.role, company: j.company, period: j.period, n: j.highlights.length }));
    for (const e of cv.education) console.log("   edu:", JSON.stringify(e));
    console.log("   skills:", cv.skills.join(" | "), "|| tools:", cv.tools.join(" | "));
  }
}
console.log(`\nscore: ${got}/${total} (${Math.round((got / total) * 100)}%)`);
// Every check passed when this set was written; a drop means a parser change broke a layout.
if (got < total) process.exit(1);
