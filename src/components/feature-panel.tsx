"use client";
/* eslint-disable @next/next/no-img-element -- small avatars from Supabase Storage or Google */

import { useEffect, useState, useTransition } from "react";
import { previewSite } from "@/lib/discover/actions";
import { PORTFOLIO_CATEGORIES } from "@/lib/discover/categories";
import { searchAboutAction } from "@/lib/feature-actions";
import { FEATURE_OUTLINE, FEATURE_SECTIONS, type AboutChoice } from "@/lib/features";
import type { ProjectRow } from "@/lib/projects";

const input = "w-full rounded-md border border-line bg-background px-3 py-2 outline-none focus:border-foreground";

/**
 * The editor's admin-only panel for Identify's own write-ups. Three independent choices:
 * who it's about (optional: a member, someone on Discover, someone new, or no one), its
 * Discoveries section (optional), and whether it's on the home page's Featured tab.
 */
export function FeaturePanel({
  project,
  initialAbout,
  body,
  setBody,
  starter,
  cover,
  setCover,
  markDirty,
}: {
  project?: ProjectRow;
  /** Who the story is already about, or the listing from "Write a feature" in Discover admin. */
  initialAbout: AboutChoice | null;
  body: string;
  setBody: (body: string) => void;
  starter: string;
  cover: string;
  setCover: (cover: string) => void;
  markDirty: () => void;
}) {
  // "" (no one in particular), "new", or a picked member/listing.
  const [chosen, setChosen] = useState<AboutChoice | "new" | null>(initialAbout);
  const about = chosen === "new" ? "new" : (chosen?.value ?? "");
  const [section, setSection] = useState<string>(project?.feature_section ?? (initialAbout ? "projects" : ""));
  const [featured, setFeatured] = useState(project ? Boolean(project.featured_at) : Boolean(initialAbout));

  // Search: members and Discover listings, as you type.
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ for: string; items: AboutChoice[] }>({ for: "", items: [] });
  const [searching, startSearching] = useTransition();
  const term = query.trim();
  useEffect(() => {
    if (!term) return;
    const timer = setTimeout(() => startSearching(async () => setResults({ for: term, items: await searchAboutAction(term) })), 250);
    return () => clearTimeout(timer);
  }, [term]);
  const suggestions = term && results.for === term ? results.items : [];

  // "Someone new": read their site to fill in who they are; saving lists them on Discover.
  const [site, setSite] = useState("");
  const [person, setPerson] = useState({ name: "", role: "", description: "", image: "", email: "", category: "developer" });
  const [reading, startReading] = useTransition();
  const [readError, setReadError] = useState("");
  const sharingImage = chosen === "new" ? person.image : (chosen?.image_url ?? "");

  function pick(next: AboutChoice | "new" | null) {
    setChosen(next);
    setQuery("");
    if (next === "new" && term && !person.name) setPerson((p) => ({ ...p, name: term }));
    // A story about someone usually belongs in Discoveries; leave it if one is already set.
    if (next && !section) setSection("projects");
    markDirty();
  }

  function readSite() {
    setReadError("");
    startReading(async () => {
      const { preview, error } = await previewSite(site);
      if (!preview) return setReadError(error ?? "Couldn't read that site.");
      setSite(preview.url);
      setPerson((p) => ({
        ...p,
        name: p.name || preview.name || "",
        description: preview.description ?? p.description,
        image: preview.imageUrl ?? "",
        email: preview.email ?? p.email,
      }));
      markDirty();
    });
  }

  const editorial = Boolean(section || chosen || featured);

  return (
    <fieldset className="rounded-lg border border-brand bg-brand/10 p-4">
      <input type="hidden" name="feature_panel" value="1" />
      <input type="hidden" name="about" value={about} />
      <legend className="px-1 text-sm font-semibold">Identify editorial</legend>
      <p className="mb-4 text-xs text-muted">
        For Identify&apos;s own write-ups about other people&apos;s work. Every choice here is optional and separate. Only admins see this.
      </p>

      {/* 1. Who it's about */}
      <div>
        <span className="mb-1 block text-sm font-medium">About (optional)</span>
        {chosen ? (
          <div className="flex items-center gap-3 rounded-md border border-line bg-background px-3 py-2">
            {chosen !== "new" && <Avatar choice={chosen} />}
            <span className="min-w-0 flex-1 truncate text-sm">
              {chosen === "new" ? (
                <strong>Someone new</strong>
              ) : (
                <>
                  <strong>{chosen.name}</strong> <span className="text-muted">{chosen.detail}</span>
                </>
              )}
            </span>
            <button type="button" onClick={() => pick(null)} className="text-sm text-muted hover:text-foreground">
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search members or Discover by name… or leave empty"
              aria-label="Search who this is about"
              className={input}
            />
            {term && (
              <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-md border border-line bg-background py-1 shadow-[0_8px_30px_rgb(0_0_0/0.12)]">
                {suggestions.map((c) => (
                  <li key={c.value}>
                    <button type="button" onClick={() => pick(c)} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-surface">
                      <Avatar choice={c} />
                      <span className="min-w-0 truncate">
                        {c.name} <span className="text-muted">{c.detail}</span>
                      </span>
                      <span className="ml-auto shrink-0 text-xs text-muted">{c.value.startsWith("m:") ? "Member" : "On Discover"}</span>
                    </button>
                  </li>
                ))}
                {searching && suggestions.length === 0 && <li className="px-3 py-2 text-sm text-muted">Searching…</li>}
                {!searching && results.for === term && suggestions.length === 0 && (
                  <li className="px-3 py-2 text-sm text-muted">No member or listing called “{term}”.</li>
                )}
                <li className="border-t border-line">
                  <button type="button" onClick={() => pick("new")} className="w-full px-3 py-2 text-left text-sm text-success hover:bg-surface">
                    + Someone new: add “{term}” with their link
                  </button>
                </li>
              </ul>
            )}
            <p className="mt-1 text-xs text-muted">
              Writing about a random project with no one to credit? Leave this empty.{" "}
              <button type="button" onClick={() => pick("new")} className="underline hover:text-foreground">
                Or add someone new
              </button>
              .
            </p>
          </div>
        )}
      </div>

      {chosen === "new" && (
        <div className="mt-3 space-y-3 rounded-md border border-line bg-background p-3">
          <p className="text-xs text-muted">
            A person, team or app that isn&apos;t listed yet. Saving adds them to Discover, so they can find the story and claim it.
          </p>
          <div className="flex gap-2">
            <input
              name="new_url"
              value={site}
              onChange={(e) => setSite(e.target.value)}
              placeholder="Their site, the app's site, a GitHub repo or a social link"
              className={input}
              required
            />
            <button
              type="button"
              onClick={readSite}
              disabled={reading || !site.trim()}
              className="shrink-0 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              {reading ? "Reading…" : "Read site"}
            </button>
          </div>
          {readError && <p className="text-sm text-danger">{readError}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              name="new_name"
              value={person.name}
              onChange={(e) => setPerson({ ...person, name: e.target.value })}
              placeholder="Their name, or the team / app name"
              maxLength={120}
              className={input}
              required
            />
            <input
              name="new_role"
              value={person.role}
              onChange={(e) => setPerson({ ...person, role: e.target.value })}
              placeholder="Who they are, e.g. Indie developer"
              maxLength={120}
              className={input}
            />
            <select name="new_category" value={person.category} onChange={(e) => setPerson({ ...person, category: e.target.value })} className={input}>
              {PORTFOLIO_CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              name="new_email"
              type="email"
              value={person.email}
              onChange={(e) => setPerson({ ...person, email: e.target.value })}
              placeholder="Their public email (optional, for the invite)"
              className={input}
            />
          </div>
          <input type="hidden" name="new_description" value={person.description} />
          <input type="hidden" name="new_image" value={person.image} />
        </div>
      )}

      {/* 2. Discoveries section, 3. Featured: each on its own. */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-sm font-medium">Discoveries section (optional)</span>
          <select
            name="feature_section"
            value={section}
            onChange={(e) => {
              setSection(e.target.value);
              markDirty();
            }}
            className={input}
          >
            <option value="">None</option>
            {FEATURE_SECTIONS.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}: {s.blurb}
              </option>
            ))}
          </select>
        </label>
        <div className="space-y-2 self-end pb-1 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="featured_home" checked={featured} onChange={(e) => setFeatured(e.target.checked)} />
            Show on the home page&apos;s Featured tab
          </label>
          <label className={`flex items-center gap-2 ${section ? "" : "opacity-50"}`}>
            <input type="checkbox" name="editors_pick" defaultChecked={project?.editors_pick} disabled={!section} />
            Editor&apos;s pick (leads Discoveries and the home page)
          </label>
        </div>
      </div>

      {editorial && (
        <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {sharingImage && cover !== sharingImage && (
            <button
              type="button"
              onClick={() => {
                setCover(sharingImage);
                markDirty();
              }}
              className="text-success underline"
            >
              Use their site&apos;s preview image as the cover
            </button>
          )}
          {!body.includes("## What caught our attention") && (
            <button
              type="button"
              onClick={() => {
                if (body.trim() && body.trim() !== starter.trim() && !window.confirm("Replace what you've written with the feature outline?")) return;
                setBody(FEATURE_OUTLINE);
                markDirty();
              }}
              className="text-success underline"
            >
              Use the feature outline
            </button>
          )}
          <span className="text-xs text-muted">Put the link to the work in Live demo; ask before using screenshots beyond their preview image.</span>
        </div>
      )}
    </fieldset>
  );
}

function Avatar({ choice }: { choice: AboutChoice }) {
  const src = choice.avatar_url ?? choice.image_url;
  return src ? (
    <img src={src} alt="" className="size-7 shrink-0 rounded-full bg-surface object-cover" />
  ) : (
    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-surface text-xs font-semibold">{choice.name.slice(0, 1)}</span>
  );
}
