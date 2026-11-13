/** "example.com" from "https://www.example.com/path". Safe in the browser (site.ts is server-only). */
export function displayHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** A username to suggest from someone's name: "Andrew Irorere" → "andrewirorere" (empty if too short). */
export function suggestUsername(name: string) {
  const base = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 30);
  return base.length >= 3 ? base : "";
}
