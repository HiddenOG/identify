/** "example.com" from "https://www.example.com/path". Safe in the browser (site.ts is server-only). */
export function displayHost(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
