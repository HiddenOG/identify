import type { ReactNode } from "react";
import { CONTACT_EMAIL } from "@/lib/site";

/** Layout for About / Privacy / Terms: a readable column with Medium-style prose. */
export function DocPage({ title, updated, intro, children }: { title: string; updated?: string; intro?: string; children: ReactNode }) {
  return (
    <main className="mx-auto max-w-[728px] px-4 py-14 sm:px-6">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
      {updated && <p className="mt-3 text-sm text-muted">Last updated {updated}</p>}
      {intro && <p className="mt-6 text-xl text-muted">{intro}</p>}
      <div className="prose prose-lg mt-10 max-w-none dark:prose-invert prose-headings:font-bold prose-headings:tracking-tight prose-a:text-foreground prose-li:my-1">
        {children}
      </div>
    </main>
  );
}

/** "Questions? Email …" when CONTACT_EMAIL is set; otherwise points to Settings. */
export function ContactLine({ topic }: { topic: string }) {
  return CONTACT_EMAIL ? (
    <p>
      Questions about {topic}? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
    </p>
  ) : (
    <p>You can edit or delete your data any time in Settings.</p>
  );
}
