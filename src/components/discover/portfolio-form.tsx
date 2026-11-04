"use client";

/* eslint-disable @next/next/no-img-element -- previews come from other people's sites */
import { useActionState, useState, useTransition } from "react";
import { previewSite, savePortfolio, suggestPortfolio } from "@/lib/discover/actions";
import { PORTFOLIO_CATEGORIES } from "@/lib/discover/categories";

export type PortfolioFormValues = {
  id?: string;
  url: string;
  name: string;
  role: string;
  location: string;
  description: string;
  image_url: string;
  category: string;
  email: string;
  featured: boolean;
};

const EMPTY: PortfolioFormValues = { url: "", name: "", role: "", location: "", description: "", image_url: "", category: "", email: "", featured: false };

const field = "w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-foreground";

/**
 * Add a portfolio by URL (reads the site's preview details first), or edit an existing one.
 * "suggest" is the members' version: same form, minus Featured and the private contact email,
 * and it goes to the review queue instead of straight onto Discover.
 */
export function PortfolioForm({ initial, mode = "admin" }: { initial?: PortfolioFormValues; mode?: "admin" | "suggest" }) {
  const admin = mode === "admin";
  const [values, setValues] = useState(initial ?? EMPTY);
  const [readError, setReadError] = useState("");
  const [reading, startReading] = useTransition();
  const [state, formAction, saving] = useActionState(async (prev: Awaited<ReturnType<typeof savePortfolio>>, formData: FormData) => {
    const result = await (admin ? savePortfolio : suggestPortfolio)(prev, formData);
    if (result?.message && !initial) setValues(EMPTY);
    return result;
  }, null);

  const set = (key: keyof PortfolioFormValues) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  function readSite() {
    setReadError("");
    startReading(async () => {
      const { preview, error } = await previewSite(values.url);
      if (error || !preview) return setReadError(error ?? "Couldn't read that site.");
      setValues((v) => ({
        ...v,
        url: preview.url,
        name: v.name || preview.name,
        description: v.description || preview.description,
        image_url: v.image_url || preview.imageUrl,
        email: v.email || preview.email,
      }));
    });
  }

  return (
    <form action={formAction} className="space-y-3">
      {values.id && <input type="hidden" name="id" value={values.id} />}
      <div className="flex gap-2">
        <input name="url" value={values.url} onChange={set("url")} required placeholder="https://janedoe.com" className={field} />
        <button
          type="button"
          onClick={readSite}
          disabled={!values.url || reading}
          className="shrink-0 rounded-full border border-foreground px-4 text-sm hover:bg-surface disabled:opacity-50"
        >
          {reading ? "Reading…" : "Read site"}
        </button>
      </div>
      {readError && <p className="text-sm text-danger">{readError}</p>}

      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <div className="grid content-start gap-3 sm:grid-cols-2">
          <input name="name" value={values.name} onChange={set("name")} required maxLength={120} placeholder="Name" className={field} />
          <input name="role" value={values.role} onChange={set("role")} maxLength={120} placeholder="Role, e.g. Product designer" className={field} />
          <input name="location" value={values.location} onChange={set("location")} maxLength={120} placeholder="Location, e.g. Lagos" className={field} />
          <select name="category" value={values.category} onChange={set("category")} required className={field}>
            <option value="" disabled>
              Category
            </option>
            {PORTFOLIO_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
          <textarea
            name="description"
            value={values.description}
            onChange={set("description")}
            maxLength={400}
            rows={2}
            placeholder="Short description"
            className={`${field} sm:col-span-2`}
          />
          <input name="image_url" value={values.image_url} onChange={set("image_url")} placeholder="Preview image URL" className={`${field} sm:col-span-2`} />
          {admin && (
            <input
              name="email"
              type="email"
              value={values.email}
              onChange={set("email")}
              placeholder="Contact email they publish (private, optional)"
              className={`${field} sm:col-span-2`}
            />
          )}
        </div>
        <div className="aspect-[16/10] overflow-hidden rounded-lg border border-line bg-surface sm:aspect-auto">
          {values.image_url && <img src={values.image_url} alt="" referrerPolicy="no-referrer" className="size-full object-cover object-top" />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        {admin && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="featured"
              checked={values.featured}
              onChange={(e) => setValues((v) => ({ ...v, featured: e.target.checked }))}
            />
            Featured
          </label>
        )}
        <button disabled={saving} className="rounded-full bg-foreground px-5 py-2 text-sm text-background hover:opacity-90 disabled:opacity-60">
          {saving ? (admin ? "Saving…" : "Sending…") : !admin ? "Send suggestion" : values.id ? "Save" : "List it"}
        </button>
        {state?.message && <span className="text-sm text-success">{state.message}</span>}
        {state?.error && <span className="text-sm text-danger">{state.error}</span>}
      </div>
    </form>
  );
}
