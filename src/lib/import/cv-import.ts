import { coerceExtracted, extractedCvSchema, normalizeExtracted, type ImportedCv } from "./cv-shape";
import { enabledProviders } from "./providers";
import { ruleParseCv } from "./rule-parser";

export type CvImportResult = ImportedCv & {
  /** Which importer produced the result, shown to the user. */
  source: string;
  /** Providers that were tried and failed, for transparency. */
  notes: string[];
};

/** Tries each configured AI provider in order, then falls back to the rule-based parser. */
export async function importCvText(text: string): Promise<CvImportResult> {
  const notes: string[] = [];

  for (const provider of enabledProviders()) {
    try {
      const parsed = extractedCvSchema.safeParse(coerceExtracted(await provider.extract(text)));
      if (!parsed.success) {
        notes.push(`${provider.label} returned an unexpected format`);
        continue;
      }
      const result = normalizeExtracted(parsed.data);
      const empty = !result.cv.summary && !result.cv.experience.length && !result.cv.skills.length;
      if (empty) {
        notes.push(`${provider.label} found nothing usable`);
        continue;
      }
      // Models sometimes skip a contact detail that's plainly in the text; the free parser's
      // pattern matching fills any gaps (it never overrides what the model found).
      const found = normalizeExtracted(ruleParseCv(text)).cv.links;
      const links = { ...result.cv.links };
      for (const key of ["email", "phone", "linkedin", "github", "website"] as const) {
        if (!links[key] && found[key]) links[key] = found[key];
      }
      return { ...result, cv: { ...result.cv, links }, source: provider.label, notes };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[cv-import] ${provider.id} failed:`, message);
      notes.push(`${provider.label} failed`);
    }
  }

  return { ...normalizeExtracted(ruleParseCv(text)), source: "Rule-based parser", notes };
}
