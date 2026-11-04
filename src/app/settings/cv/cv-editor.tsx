"use client";

import { useEffect, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { ClassicTemplate } from "@/components/cv/classic-template";
import type { CVProject } from "@/components/cv/types";
import type { CV, Education, Experience } from "@/lib/cv/schema";
import { makeCutout } from "@/lib/cutout";
import { createClient } from "@/lib/supabase/client";
import { FONT_OPTIONS, THEME_PRESETS, type FontKey, type Theme } from "@/lib/themes";
import { saveSettings } from "./actions";
import { importCv } from "./import-actions";

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

export type EditorState = {
  username: string;
  full_name: string;
  headline: string;
  location: string;
  avatar_url: string;
  open_to_work: boolean;
  cv: CV;
  theme: Theme & { preset?: string };
};

const input = "w-full rounded-md border border-line bg-background px-3 py-2 outline-none focus:border-foreground";
const emptyJob: Experience = { role: "", company: "", location: "", period: "", highlights: [] };
const emptyEdu: Education = { title: "", meta: "" };

/** Textarea-backed list: one item per line. */
const toLines = (items: string[]) => items.join("\n");
const fromLines = (text: string) => text.split("\n").map((l) => l.trim()).filter(Boolean);

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Section({ title, children, action, id }: { title: string; children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <section id={id} className="scroll-mt-20 rounded-lg border border-line p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold">{title}</h2>
        {action}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function move<T>(list: T[], from: number, to: number) {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function RowControls({ index, length, onMove, onRemove }: {
  index: number;
  length: number;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  const btn = "rounded px-2 py-1 text-xs text-muted hover:bg-surface hover:text-foreground disabled:opacity-30";
  return (
    <div className="flex gap-1">
      <button type="button" className={btn} disabled={index === 0} onClick={() => onMove(index - 1)} aria-label="Move up">
        ↑
      </button>
      <button type="button" className={btn} disabled={index === length - 1} onClick={() => onMove(index + 1)} aria-label="Move down">
        ↓
      </button>
      <button type="button" className={`${btn} hover:text-danger`} onClick={onRemove}>
        Remove
      </button>
    </div>
  );
}

export function CvEditor({ userId, initial, projects }: { userId: string; initial: EditorState; projects: CVProject[] }) {
  const [state, setState] = useState(initial);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [saving, startSaving] = useTransition();
  const [status, setStatus] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  // "cutting" while the background is removed in the browser, then "uploading".
  const [uploading, setUploading] = useState<"cutting" | "uploading" | null>(null);
  const [removeBackground, setRemoveBackground] = useState(true);
  const [baseline, setBaseline] = useState(() => JSON.stringify(initial));
  // Stable keys so uncontrolled highlight textareas follow their role when reordered/removed.
  const [jobKeys, setJobKeys] = useState(() => initial.cv.experience.map(() => crypto.randomUUID()));
  const dirty = JSON.stringify(state) !== baseline;
  // Closing or reloading the tab with unsaved changes asks first (an import isn't saved until Save CV).
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  // Bumping this remounts the form so uncontrolled textareas pick up imported values.
  const [formKey, setFormKey] = useState(0);
  const [importing, startImporting] = useTransition();
  const [importInfo, setImportInfo] = useState<{ kind: "ok" | "error"; text: string; notes?: string[] } | null>(null);

  function importFile(file: File) {
    const hasContent = state.cv.summary || state.cv.experience.length || state.cv.skills.length;
    if (hasContent && !window.confirm("Replace your current CV content with what's in this file? Nothing is saved until you click Save CV.")) {
      return;
    }
    setImportInfo(null);
    const formData = new FormData();
    formData.set("file", file);
    startImporting(async () => {
      const { result, error } = await importCv(formData);
      if (!result) return setImportInfo({ kind: "error", text: error ?? "Import failed." });

      const links = Object.fromEntries(Object.entries(result.cv.links).filter(([, v]) => v));
      setState((s) => ({
        ...s,
        full_name: result.basics.full_name || s.full_name,
        headline: result.basics.headline || s.headline,
        location: result.basics.location || s.location,
        cv: { ...result.cv, links: { ...s.cv.links, ...links } },
      }));
      setJobKeys(result.cv.experience.map(() => crypto.randomUUID()));
      setFormKey((k) => k + 1);
      setStatus(null);
      setImportInfo({
        kind: "ok",
        text: `Filled in by ${result.source}. Check every section, fix anything it got wrong, then click Save CV.`,
        notes: result.notes,
      });
    });
  }

  const update = (patch: Partial<EditorState>) => {
    setStatus(null);
    setState((s) => ({ ...s, ...patch }));
  };
  const updateCv = (patch: Partial<CV>) => update({ cv: { ...state.cv, ...patch } });
  const updateTheme = (patch: Partial<EditorState["theme"]>) => update({ theme: { ...state.theme, ...patch } });

  async function uploadAvatar(file: File) {
    if (!file.type.startsWith("image/")) return setStatus({ kind: "error", text: "Choose an image file." });
    if (file.size > MAX_AVATAR_BYTES) return setStatus({ kind: "error", text: "Photos must be under 3 MB." });

    // Cut the person out of the background, like the classic portrait; fall back to the original photo.
    let upload: Blob = file;
    let ext = file.name.split(".").pop()?.toLowerCase() || "png";
    let note: string | null = null;
    if (removeBackground) {
      setUploading("cutting");
      try {
        upload = await makeCutout(file);
        ext = "png";
      } catch {
        note = "Couldn't remove the background from this photo, so we used it as is. A photo of you against a plain wall works best.";
      }
    }

    setUploading("uploading");
    const supabase = createClient();
    // Storage policies only allow writes under the user's own id folder.
    const path = `${userId}/avatar-${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, upload, { contentType: upload.type || file.type });
    setUploading(null);
    if (error) return setStatus({ kind: "error", text: error.message });
    update({ avatar_url: supabase.storage.from("avatars").getPublicUrl(path).data.publicUrl });
    if (note) setStatus({ kind: "error", text: note });
  }

  function save() {
    // Drop entries the user left blank so the CV doesn't show empty rows.
    const keepJob = state.cv.experience.map((j) => Boolean(j.role.trim() || j.company.trim()));
    const cleaned: EditorState = {
      ...state,
      cv: {
        ...state.cv,
        experience: state.cv.experience.filter((_, i) => keepJob[i]),
        education: state.cv.education.filter((e) => e.title.trim()),
      },
    };
    startSaving(async () => {
      const result = await saveSettings({
        full_name: cleaned.full_name,
        headline: cleaned.headline,
        location: cleaned.location,
        avatar_url: cleaned.avatar_url,
        open_to_work: cleaned.open_to_work,
        cv: cleaned.cv,
        theme: cleaned.theme,
      });
      if (!result.ok) return setStatus({ kind: "error", text: result.error ?? "Could not save." });
      setState(cleaned);
      setJobKeys((keys) => keys.filter((_, i) => keepJob[i]));
      setBaseline(JSON.stringify(cleaned));
      setStatus({ kind: "ok", text: "Saved. Your CV website is up to date." });
      setImportInfo((info) => (info?.kind === "ok" ? { kind: "ok", text: "Saved. Your CV website now shows what was imported." } : info));
    });
  }

  const addJob = () => {
    updateCv({ experience: [...state.cv.experience, { ...emptyJob }] });
    setJobKeys((keys) => [...keys, crypto.randomUUID()]);
  };
  const moveJob = (from: number, to: number) => {
    updateCv({ experience: move(state.cv.experience, from, to) });
    setJobKeys((keys) => move(keys, from, to));
  };
  const removeJob = (index: number) => {
    updateCv({ experience: state.cv.experience.filter((_, k) => k !== index) });
    setJobKeys((keys) => keys.filter((_, k) => k !== index));
  };

  const { cv, theme } = state;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h2 className="mr-auto text-2xl font-bold tracking-tight">Your CV</h2>
        <div className="flex rounded-full border border-line p-1 text-sm">
          {(["edit", "preview"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-1.5 capitalize ${tab === t ? "bg-foreground text-background" : "text-muted"}`}
            >
              {t}
            </button>
          ))}
        </div>
        <Link href={`/${state.username}`} className="text-sm text-muted underline hover:text-foreground">
          View public page
        </Link>
      </div>

      {tab === "preview" ? (
        <div className="overflow-hidden rounded-lg border border-line">
          <ClassicTemplate
            profile={{
              username: state.username,
              fullName: state.full_name,
              headline: state.headline || null,
              location: state.location || null,
              avatarUrl: state.avatar_url || null,
              openToWork: state.open_to_work,
            }}
            cv={cv}
            theme={theme}
            projects={projects}
          />
        </div>
      ) : (
        <div key={formKey} className="space-y-6">
          <section className="rounded-lg border-2 border-dashed border-line p-5 sm:p-6">
            <div className="flex flex-wrap items-center gap-4">
              <div className="mr-auto">
                <h2 className="text-lg font-semibold">Import from your existing CV</h2>
                <p className="text-sm text-muted">Upload a PDF or Word (.docx) file and we&apos;ll fill in the fields below for you to review.</p>
              </div>
              <label className={`cursor-pointer rounded-full bg-foreground px-5 py-2 text-sm font-medium text-background ${importing ? "opacity-60" : ""}`}>
                {importing ? "Reading your CV…" : "Upload CV"}
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="sr-only"
                  disabled={importing}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (file) importFile(file);
                  }}
                />
              </label>
            </div>
            {importInfo && (
              <div className={`mt-4 rounded-md px-4 py-3 text-sm ${importInfo.kind === "ok" ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>
                {importInfo.text}
                {importInfo.notes && importInfo.notes.length > 0 && (
                  <span className="mt-1 block text-xs opacity-80">Tried first: {importInfo.notes.join("; ")}.</span>
                )}
                {/* Uploading only fills the form; make saving one obvious click away. */}
                {importInfo.kind === "ok" && dirty && (
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving || Boolean(uploading)}
                    className="mt-3 block rounded-full bg-foreground px-5 py-2 font-medium text-background disabled:opacity-50"
                  >
                    {saving ? "Saving…" : "Looks good, save CV now"}
                  </button>
                )}
              </div>
            )}
          </section>

          <Section title="Basics" id="profile">
            <div className="flex items-end gap-5">
              {/* A small copy of the CV's dashed portrait frame, so the cut-out previews as it will appear. */}
              <div className="grid h-[136px] w-24 shrink-0 rotate-[5deg] border-2 border-dashed border-foreground">
                {state.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element -- user upload from Supabase Storage
                  <img src={state.avatar_url} alt="" className="h-[124px] w-20 -rotate-[5deg] self-end justify-self-center object-contain object-bottom" />
                ) : (
                  <span className="grid h-[112px] w-20 -rotate-[5deg] place-items-center self-end justify-self-center bg-brand text-3xl font-semibold text-brand-ink">
                    {(state.full_name || state.username).charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <label className={`rounded-full border border-foreground px-4 py-1.5 ${uploading ? "opacity-60" : "cursor-pointer"}`}>
                    {uploading === "cutting"
                      ? "Removing background…"
                      : uploading === "uploading"
                        ? "Uploading…"
                        : state.avatar_url
                          ? "Change photo"
                          : "Upload photo"}
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      disabled={Boolean(uploading)}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = ""; // allow picking the same file again
                        if (file) void uploadAvatar(file);
                      }}
                    />
                  </label>
                  {state.avatar_url && !uploading && (
                    <button type="button" className="px-2 text-muted hover:text-danger" onClick={() => update({ avatar_url: "" })}>
                      Remove
                    </button>
                  )}
                </div>
                <label className="flex items-center gap-2 text-muted">
                  <input
                    type="checkbox"
                    checked={removeBackground}
                    onChange={(e) => setRemoveBackground(e.target.checked)}
                    className="size-4 accent-foreground"
                  />
                  Remove the background automatically
                </label>
                <p className="max-w-sm text-xs text-muted">
                  Best with a waist-up photo against a plain wall. It runs in your browser; the first time takes a few seconds to
                  load.
                </p>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <input className={input} value={state.full_name} maxLength={80} onChange={(e) => update({ full_name: e.target.value })} />
              </Field>
              <Field label="Location">
                <input className={input} value={state.location} maxLength={80} placeholder="Lagos, Nigeria" onChange={(e) => update({ location: e.target.value })} />
              </Field>
            </div>
            <Field label="Headline">
              <input
                className={input}
                value={state.headline}
                maxLength={120}
                placeholder="AI Engineer · Full-Stack Engineer"
                onChange={(e) => update({ headline: e.target.value })}
              />
            </Field>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                className="size-4 accent-black"
                checked={state.open_to_work}
                onChange={(e) => update({ open_to_work: e.target.checked })}
              />
              <span className="text-sm font-medium">Open to work</span>
              <span className="text-xs text-muted">Shows a badge on your CV and in search.</span>
            </label>
          </Section>

          <Section title="Profile summary">
            <textarea
              className={input}
              rows={5}
              maxLength={2000}
              value={cv.summary}
              placeholder="Who you are, what you build, what you care about."
              onChange={(e) => updateCv({ summary: e.target.value })}
            />
          </Section>

          <div className="grid gap-6 lg:grid-cols-2">
            <Section title="Skills">
              <Field label="One per line" hint="e.g. RAG Pipelines & Prompt Engineering">
                <textarea
                  className={input}
                  rows={8}
                  defaultValue={toLines(cv.skills)}
                  onChange={(e) => updateCv({ skills: fromLines(e.target.value).slice(0, 40) })}
                />
              </Field>
            </Section>
            <Section title="Tools & technologies">
              <Field label="Comma separated" hint="Common tools (Python, React, Docker…) get their logo automatically.">
                <textarea
                  className={input}
                  rows={8}
                  defaultValue={cv.tools.join(", ")}
                  onChange={(e) =>
                    updateCv({ tools: e.target.value.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 40) })
                  }
                />
              </Field>
            </Section>
          </div>

          <Section
            title="Experience"
            action={
              <button
                type="button"
                className="rounded-full border border-foreground px-3 py-1 text-sm"
                onClick={addJob}
              >
                + Add role
              </button>
            }
          >
            {cv.experience.length === 0 && <p className="text-sm text-muted">No roles yet.</p>}
            {cv.experience.map((job, i) => {
              const setJob = (patch: Partial<Experience>) =>
                updateCv({ experience: cv.experience.map((j, k) => (k === i ? { ...j, ...patch } : j)) });
              return (
                <div key={jobKeys[i]} className="space-y-3 rounded-md bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted">Role {i + 1}</span>
                    <RowControls
                      index={i}
                      length={cv.experience.length}
                      onMove={(to) => moveJob(i, to)}
                      onRemove={() => removeJob(i)}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input className={input} placeholder="Role" value={job.role} onChange={(e) => setJob({ role: e.target.value })} />
                    <input className={input} placeholder="Company" value={job.company} onChange={(e) => setJob({ company: e.target.value })} />
                    <input className={input} placeholder="Location (or Remote)" value={job.location} onChange={(e) => setJob({ location: e.target.value })} />
                    <input className={input} placeholder="2024 - Present" value={job.period} onChange={(e) => setJob({ period: e.target.value })} />
                  </div>
                  <textarea
                    className={input}
                    rows={3}
                    placeholder="Highlights, one per line"
                    defaultValue={toLines(job.highlights)}
                    onChange={(e) => setJob({ highlights: fromLines(e.target.value).slice(0, 10) })}
                  />
                </div>
              );
            })}
          </Section>

          <Section
            title="Education & certifications"
            action={
              <button
                type="button"
                className="rounded-full border border-foreground px-3 py-1 text-sm"
                onClick={() => updateCv({ education: [...cv.education, { ...emptyEdu }] })}
              >
                + Add
              </button>
            }
          >
            {cv.education.length === 0 && <p className="text-sm text-muted">Nothing added yet.</p>}
            {cv.education.map((edu, i) => {
              const setEdu = (patch: Partial<Education>) =>
                updateCv({ education: cv.education.map((e, k) => (k === i ? { ...e, ...patch } : e)) });
              return (
                <div key={i} className="grid items-center gap-3 sm:grid-cols-[1fr_180px_auto]">
                  <input className={input} placeholder="B.Sc. Computer Science - University of Lagos" value={edu.title} onChange={(e) => setEdu({ title: e.target.value })} />
                  <input className={input} placeholder="2019 - 2023" value={edu.meta} onChange={(e) => setEdu({ meta: e.target.value })} />
                  <RowControls
                    index={i}
                    length={cv.education.length}
                    onMove={(to) => updateCv({ education: move(cv.education, i, to) })}
                    onRemove={() => updateCv({ education: cv.education.filter((_, k) => k !== i) })}
                  />
                </div>
              );
            })}
          </Section>

          <Section title="Contact links">
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  ["email", "Email", "you@example.com"],
                  ["phone", "Phone", "+234…"],
                  ["linkedin", "LinkedIn", "https://linkedin.com/in/…"],
                  ["github", "GitHub", "https://github.com/…"],
                  ["website", "Website", "https://…"],
                ] as const
              ).map(([key, label, placeholder]) => (
                <Field key={key} label={label}>
                  <input
                    className={input}
                    placeholder={placeholder}
                    value={cv.links[key] ?? ""}
                    onChange={(e) => updateCv({ links: { ...cv.links, [key]: e.target.value } })}
                  />
                </Field>
              ))}
            </div>
          </Section>

          <Section title="Theme" id="design">
            <div className="flex flex-wrap gap-2">
              {Object.entries(THEME_PRESETS).map(([key, preset]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => update({ theme: { preset: key, accent: preset.accent, ink: preset.ink, paper: preset.paper, font: preset.font } })}
                  className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${theme.preset === key ? "border-foreground" : "border-line"}`}
                >
                  <span className="size-4 rounded-full border border-black/10" style={{ background: preset.accent }} />
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              {(
                [
                  ["accent", "Accent"],
                  ["ink", "Text"],
                  ["paper", "Background"],
                ] as const
              ).map(([key, label]) => (
                <Field key={key} label={label}>
                  <input
                    type="color"
                    className="h-10 w-full cursor-pointer rounded-md border border-line bg-background p-1"
                    value={theme[key]}
                    onChange={(e) => updateTheme({ [key]: e.target.value, preset: undefined })}
                  />
                </Field>
              ))}
              <Field label="Font">
                <select
                  className={input}
                  value={theme.font}
                  onChange={(e) => updateTheme({ font: e.target.value as FontKey, preset: undefined })}
                >
                  {Object.entries(FONT_OPTIONS).map(([key, f]) => (
                    <option key={key} value={key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>
        </div>
      )}

      <div className="sticky bottom-0 mt-6 flex items-center justify-end gap-3 border-t border-line bg-background py-4">
        {status && (
          <p className={`mr-auto text-sm ${status.kind === "ok" ? "text-success" : "text-danger"}`}>{status.text}</p>
        )}
        {!status && dirty && (
          <p className="mr-auto text-sm font-medium text-danger">Not saved yet: your CV website won&apos;t change until you save.</p>
        )}
        <button
          type="button"
          onClick={save}
          disabled={saving || Boolean(uploading) || !dirty}
          className="rounded-full bg-foreground px-6 py-2 font-medium text-background disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save CV"}
        </button>
      </div>
    </div>
  );
}
