"use client";
/* eslint-disable @next/next/no-img-element -- cover previews come from Supabase Storage or user URLs */

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { importGithubRepo } from "@/lib/import/github-action";
import { coverFromLink, saveProject, type SaveProjectState } from "@/lib/project-actions";
import { FeaturePanel } from "@/components/feature-panel";
import { FEATURE_OUTLINE, type AboutChoice } from "@/lib/features";
import type { ProjectRow } from "@/lib/projects";
import { Logo } from "@/components/logo";
import { SITE_NAME } from "@/lib/site";
import { createClient } from "@/lib/supabase/client";

const MAX_COVER_BYTES = 5 * 1024 * 1024;

const STARTER = `## What it does

Describe the problem and what you built.

## How it works

- Architecture, key decisions, trade-offs

## Tech stack

\`\`\`bash
# how to run it
\`\`\`
`;

const input = "w-full rounded-md border border-line px-3 py-2 outline-none focus:border-foreground";

export function ProjectEditor({
  userId,
  project,
  editorial,
}: {
  userId: string;
  project?: ProjectRow;
  /** Admins only: the editorial panel, with who the story is about so far. */
  editorial?: { initialAbout: AboutChoice | null };
}) {
  const [state, action, pending] = useActionState<SaveProjectState, FormData>(saveProject, {});
  const published = project?.status === "published";
  const [body, setBody] = useState(project?.body_md ?? (editorial?.initialAbout ? FEATURE_OUTLINE : STARTER));
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [cover, setCover] = useState(project?.cover_url ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [dirty, setDirty] = useState(false);
  // Uncontrolled fields read these; an import replaces them and bumps fieldsKey to remount the inputs.
  const [defaults, setDefaults] = useState({
    title: project?.title ?? "",
    summary: project?.summary ?? "",
    demo_url: project?.demo_url ?? "",
    repo_url: project?.repo_url ?? "",
    tags: project?.tags.join(", ") ?? "",
  });
  const [fieldsKey, setFieldsKey] = useState(0);
  const [repoUrl, setRepoUrl] = useState("");
  const [importing, startImporting] = useTransition();
  const [importMessage, setImportMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  // Cover from a link: an image address or a website's preview picture.
  const [coverLink, setCoverLink] = useState("");
  const [fetchingCover, startFetchingCover] = useTransition();

  function applyCoverLink() {
    setUploadError("");
    startFetchingCover(async () => {
      const { url, error } = await coverFromLink(coverLink);
      if (!url) return setUploadError(error ?? "Couldn't use that link.");
      setCover(url);
      setCoverLink("");
      setDirty(true);
    });
  }

  // The cover URL that failed to load, if any.
  const [brokenCover, setBrokenCover] = useState<string | null>(null);

  const saveStatus = pending ? "Saving…" : dirty ? "Unsaved changes" : project ? "Saved" : "";

  function importRepo() {
    const edited = body.trim() !== STARTER.trim() && body.trim() !== "";
    if (edited && !window.confirm("Replace the current title, links, tags, cover and body with the repo's details?")) return;
    setImportMessage(null);
    startImporting(async () => {
      const { draft, error } = await importGithubRepo(repoUrl);
      if (!draft) return setImportMessage({ kind: "error", text: error ?? "Import failed." });
      setDefaults({
        title: draft.title,
        summary: draft.summary,
        demo_url: draft.demo_url,
        repo_url: draft.repo_url,
        tags: draft.tags.join(", "),
      });
      setBody(draft.body_md || STARTER);
      setCover(draft.cover_url);
      setFieldsKey((k) => k + 1);
      setDirty(true);
      setTab(draft.starterReadme ? "write" : "preview");
      setImportMessage({
        kind: "ok",
        text: draft.starterReadme
          ? `The repo's README is the default ${draft.starterReadme} starter text, so we skipped it and started a write-up outline with your stack. Fill in the sections below.`
          : "Imported from GitHub. A README is written for developers; consider adding why you built it and what you learned.",
      });
    });
  }

  async function uploadCover(file: File) {
    setUploadError("");
    if (!file.type.startsWith("image/")) return setUploadError("Choose an image file.");
    if (file.size > MAX_COVER_BYTES) return setUploadError("Images must be under 5 MB.");

    setUploading(true);
    const supabase = createClient();
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    // Storage policies only allow writes under the user's own id folder.
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("project-images").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (error) return setUploadError(error.message);
    setCover(supabase.storage.from("project-images").getPublicUrl(path).data.publicUrl);
    setDirty(true);
  }

  return (
    <form action={action} onInput={() => setDirty(true)} className="mx-auto max-w-3xl space-y-6 px-4 pt-20 pb-10">
      {project && <input type="hidden" name="id" value={project.id} />}
      <input type="hidden" name="cover_url" value={cover} />
      <input type="hidden" name="body_md" value={body} />

      {/* Slim top bar; it sits over the site header, so there's no search here. Publish is at the bottom. */}
      <div className="fixed inset-x-0 top-0 z-50 h-14 border-b border-line bg-background">
        <div className="mx-auto flex h-full max-w-5xl items-center gap-4 px-4">
          <Link href="/" aria-label={`${SITE_NAME} home`} className="shrink-0">
            <Logo size={26} />
          </Link>
          <span className="text-sm">{published ? "Published" : "Draft"}</span>
          {saveStatus && <span className="hidden text-sm text-muted sm:inline">{saveStatus}</span>}
        </div>
      </div>

      {editorial && (
        <FeaturePanel
          project={project}
          initialAbout={editorial.initialAbout}
          body={body}
          setBody={setBody}
          starter={STARTER}
          cover={cover}
          setCover={setCover}
          markDirty={() => setDirty(true)}
        />
      )}

      <div className="rounded-lg bg-surface p-4">
        <p className="mb-2 text-sm font-medium">Start from a GitHub repo</p>
        <div className="flex gap-2">
          <input
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (repoUrl.trim()) importRepo();
              }
            }}
            placeholder="https://github.com/you/project"
            className={`${input} bg-background`}
          />
          <button
            type="button"
            onClick={importRepo}
            disabled={importing || !repoUrl.trim()}
            className="shrink-0 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {importing ? "Importing…" : "Import"}
          </button>
        </div>
        <p className="mt-2 text-xs text-muted">Fills the title, summary, tags, links and README. Public repos only.</p>
        {importMessage && (
          <p className={`mt-2 text-sm ${importMessage.kind === "ok" ? "text-success" : "text-danger"}`}>{importMessage.text}</p>
        )}
      </div>

      <input
        key={`title-${fieldsKey}`}
        name="title"
        required
        maxLength={140}
        defaultValue={defaults.title}
        placeholder="Project title"
        className="w-full border-none bg-transparent font-serif text-4xl font-bold outline-none placeholder:text-line"
      />
      <input
        key={`summary-${fieldsKey}`}
        name="summary"
        maxLength={280}
        defaultValue={defaults.summary}
        placeholder="One-line summary shown in the feed"
        className="w-full border-none bg-transparent text-xl text-muted outline-none placeholder:text-line"
      />

      <div>
        {cover ? (
          <div className="relative">
            {/* A cover that won't load shows a clear message instead of a broken-image icon. */}
            {brokenCover === cover ? (
              <div className="grid aspect-[2/1] w-full place-items-center rounded-lg bg-surface px-6 text-center text-sm text-muted">
                This cover image couldn&apos;t load. Remove it and upload one instead.
              </div>
            ) : (
              <img
                src={cover}
                alt=""
                onError={() => setBrokenCover(cover)}
                className="aspect-[2/1] w-full rounded-lg bg-surface object-cover"
              />
            )}
            <button
              type="button"
              onClick={() => {
                setCover("");
                setDirty(true);
              }}
              className="absolute right-3 top-3 rounded-full bg-background/90 px-3 py-1 text-sm"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <label className="grid aspect-[3/1] cursor-pointer place-items-center rounded-lg border-2 border-dashed border-line text-muted hover:border-foreground">
              {uploading ? "Uploading…" : "Add a cover image (screenshot of your project)"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                disabled={uploading}
                onChange={(e) => e.target.files?.[0] && uploadCover(e.target.files[0])}
              />
            </label>
            <div className="mt-3 flex gap-2">
              <input
                value={coverLink}
                onChange={(e) => setCoverLink(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    if (coverLink.trim()) applyCoverLink();
                  }
                }}
                placeholder="Or paste a website or image link to use its picture"
                aria-label="Cover image from a link"
                className={input}
              />
              <button
                type="button"
                onClick={applyCoverLink}
                disabled={fetchingCover || !coverLink.trim()}
                className="shrink-0 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
              >
                {fetchingCover ? "Getting…" : "Use picture"}
              </button>
            </div>
          </>
        )}
        {uploadError && <p className="mt-2 text-sm text-danger">{uploadError}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Live demo URL</span>
          <input key={`demo-${fieldsKey}`} name="demo_url" type="url" defaultValue={defaults.demo_url} placeholder="https://" className={input} />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Repository URL</span>
          <input key={`repo-${fieldsKey}`} name="repo_url" type="url" defaultValue={defaults.repo_url} placeholder="https://github.com/…" className={input} />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium">Tags</span>
        <input
          key={`tags-${fieldsKey}`}
          name="tags"
          defaultValue={defaults.tags}
          placeholder="python, fastapi, rag"
          className={input}
        />
        <span className="mt-1 block text-xs text-muted">Comma separated, up to 8.</span>
      </label>

      <div>
        <div className="mb-2 flex gap-1 text-sm">
          {(["write", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 capitalize ${tab === t ? "bg-foreground text-background" : "text-muted hover:text-foreground"}`}
            >
              {t}
            </button>
          ))}
          <span className="ml-auto self-center text-xs text-muted">Markdown supported</span>
        </div>
        {tab === "write" ? (
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={22}
            className={`${input} font-mono text-sm leading-6`}
            placeholder="Write it like a README…"
          />
        ) : (
          <div className="min-h-96 rounded-md border border-line p-6">
            {body.trim() ? <Markdown>{body}</Markdown> : <p className="text-muted">Nothing to preview.</p>}
          </div>
        )}
      </div>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}

      <div className="sticky bottom-0 flex justify-end gap-3 border-t border-line bg-background py-4">
        <button
          name="intent"
          value="draft"
          disabled={pending || uploading}
          className="rounded-full border border-foreground px-5 py-2 font-medium disabled:opacity-60"
        >
          Save draft
        </button>
        <button
          name="intent"
          value="publish"
          disabled={pending || uploading}
          className="rounded-full bg-foreground px-5 py-2 font-medium text-background disabled:opacity-60"
        >
          {pending ? "Saving…" : published ? "Update" : "Publish"}
        </button>
      </div>
    </form>
  );
}
