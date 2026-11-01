import mammoth from "mammoth";
import { extractLinks, extractText, getDocumentProxy } from "unpdf";

export const MAX_CV_BYTES = 5 * 1024 * 1024;
/** Real CVs are a few thousand characters; anything far beyond this isn't a CV. */
export const MAX_CV_CHARS = 60_000;

export class ImportError extends Error {}

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((b, i) => bytes[i] === b);
}

/** Turns an uploaded PDF, DOCX or TXT CV into plain text (plus any hyperlinks found in a PDF). */
export async function extractCvText(file: File): Promise<string> {
  if (file.size === 0) throw new ImportError("That file is empty.");
  if (file.size > MAX_CV_BYTES) throw new ImportError("CV files must be under 5 MB.");

  const bytes = new Uint8Array(await file.arrayBuffer());
  const name = file.name.toLowerCase();
  let text: string;

  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) {
    // %PDF
    const pdf = await getDocumentProxy(bytes);
    const [{ text: body }, { links }] = await Promise.all([extractText(pdf, { mergePages: true }), extractLinks(pdf)]);
    // LinkedIn/GitHub are often only present as clickable links, not visible text.
    const unique = [...new Set(links.filter((l) => /^https?:|^mailto:/i.test(l)))];
    text = unique.length ? `${body}\n\nLinks in document:\n${unique.join("\n")}` : body;
  } else if (startsWith(bytes, [0x50, 0x4b]) && name.endsWith(".docx")) {
    // PK zip container
    text = (await mammoth.extractRawText({ buffer: Buffer.from(bytes) })).value;
  } else if (name.endsWith(".txt") || name.endsWith(".md")) {
    text = new TextDecoder().decode(bytes);
  } else {
    throw new ImportError("Upload a PDF or Word (.docx) file. Older .doc files aren't supported; save as .docx first.");
  }

  text = text.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  if (text.length < 40) {
    throw new ImportError("Couldn't read any text from that file. If it's a scanned image, export it as a text PDF.");
  }
  if (text.length > MAX_CV_CHARS) {
    throw new ImportError("That document is too long to be a CV (over 60,000 characters).");
  }
  return text;
}
