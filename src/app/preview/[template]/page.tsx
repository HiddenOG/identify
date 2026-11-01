import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { RenderTemplate, TEMPLATES } from "@/components/cv/render-template";
import { sampleCV, sampleProfile } from "@/lib/cv/sample";
import { resolveTheme, THEME_PRESETS } from "@/lib/themes";

export const metadata: Metadata = { title: "Template preview", robots: { index: false } };

/** Renders a template with sample data, e.g. /preview/classic?preset=sky. No database needed. */
export default function PreviewPage(props: PageProps<"/preview/[template]">) {
  return (
    <main>
      <Suspense>
        <Preview {...props} />
      </Suspense>
    </main>
  );
}

async function Preview({ params, searchParams }: PageProps<"/preview/[template]">) {
  const { template } = await params;
  if (!(template in TEMPLATES)) notFound();
  const { preset } = await searchParams;
  const active = typeof preset === "string" && preset in THEME_PRESETS ? preset : "lime";

  return (
    <>
      <div className="flex flex-wrap items-center justify-center gap-2 border-b border-line px-4 py-3 text-sm print:hidden">
        <span className="text-muted">Theme:</span>
        {Object.entries(THEME_PRESETS).map(([key, t]) => (
          <Link
            key={key}
            href={`/preview/${template}?preset=${key}`}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1 ${key === active ? "border-foreground" : "border-line"}`}
          >
            <span className="size-3 rounded-full" style={{ background: t.accent }} />
            {t.label}
          </Link>
        ))}
        {/* The sample's job is to sell the real thing. */}
        <Link
          href="/login?mode=signup&next=/settings/cv"
          className="ml-2 rounded-full bg-foreground px-4 py-1 font-medium text-background hover:opacity-90"
        >
          Make your own →
        </Link>
      </div>
      <RenderTemplate
        template={template}
        profile={sampleProfile}
        cv={sampleCV}
        theme={resolveTheme({ preset: active })}
        projects={[]}
      />
    </>
  );
}
