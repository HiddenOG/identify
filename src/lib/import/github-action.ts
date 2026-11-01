"use server";

import { createClient } from "@/lib/supabase/server";
import { fetchGithubDraft, GithubImportError, type GithubDraft } from "./github";

const MAX_COVER_BYTES = 5 * 1024 * 1024;

/**
 * Copies the cover into the user's own storage so it doesn't depend on GitHub's servers being
 * reachable (or allowed) from every reader's network. Keeps the original URL if the copy fails.
 */
async function storeCover(supabase: Awaited<ReturnType<typeof createClient>>, userId: string, url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !/^image\/(png|jpe?g|webp|gif)/.test(type)) return url;
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength > MAX_COVER_BYTES) return url;
    const ext = type.includes("png") ? "png" : type.includes("webp") ? "webp" : type.includes("gif") ? "gif" : "jpg";
    // Storage policies only allow writes under the user's own id folder.
    const path = `${userId}/github-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("project-images").upload(path, bytes, { contentType: type });
    if (error) return url;
    return supabase.storage.from("project-images").getPublicUrl(path).data.publicUrl;
  } catch {
    return url;
  }
}

export async function importGithubRepo(url: string): Promise<{ draft?: GithubDraft; error?: string }> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return { error: "Sign in to import a repo." };

  try {
    const draft = await fetchGithubDraft(url);
    return { draft: { ...draft, cover_url: await storeCover(supabase, userId, draft.cover_url) } };
  } catch (error) {
    if (error instanceof GithubImportError) return { error: error.message };
    console.error("[importGithubRepo]", error);
    return { error: "Couldn't reach GitHub. Try again." };
  }
}
