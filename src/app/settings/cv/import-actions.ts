"use server";

import { importCvText, type CvImportResult } from "@/lib/import/cv-import";
import { extractCvText, ImportError } from "@/lib/import/extract-text";
import { createClient } from "@/lib/supabase/server";

export type CvImportState = { result?: CvImportResult; error?: string };

/** Reads an uploaded CV and returns a prefilled CV for the editor. Nothing is saved here. */
export async function importCv(formData: FormData): Promise<CvImportState> {
  // Signed-in users only, so anonymous visitors can't spend the AI keys.
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) return { error: "Sign in to import a CV." };

  const file = formData.get("file");
  if (!(file instanceof File)) return { error: "Choose a file to import." };

  try {
    const text = await extractCvText(file);
    return { result: await importCvText(text) };
  } catch (error) {
    if (error instanceof ImportError) return { error: error.message };
    console.error("[importCv]", error);
    return { error: "Couldn't read that file. Try exporting it as a PDF again." };
  }
}
