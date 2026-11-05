import Link from "next/link";
import { FeatureCard, FeatureHero } from "@/components/discover/feature-card";
import { ShowMore } from "@/components/show-more";
import { getCachedFeatures } from "@/lib/discover/cached";
import { FEATURE_SECTIONS, sectionInfo, type FeatureSection } from "@/lib/features";
import { SITE_NAME } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/env";

const chip = "shrink-0 rounded-full px-4 py-1.5 text-sm";

/** Discoveries: every feature, or one section of them, lead story first. */
export async function FeaturesView({ section }: { section?: FeatureSection }) {
  const features = hasSupabaseEnv ? await getCachedFeatures(section, 100) : [];
  const [lead, ...rest] = features;

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <Link href="/discover" className="text-sm text-muted hover:text-foreground">
        ← Discover
      </Link>
      <p className="mt-6 text-xs font-semibold tracking-[0.12em] text-muted uppercase">{SITE_NAME} / Discoveries</p>
      <h1 className="mt-2 font-serif text-4xl font-bold sm:text-5xl">{section ? sectionInfo(section).label : "Discoveries"}</h1>
      <p className="mt-2 text-lg text-muted">
        {section ? sectionInfo(section).blurb : "The stories behind exceptional work we found on the internet."}
      </p>

      <nav className="mt-8 mb-10 flex gap-2 overflow-x-auto pb-1" aria-label="Sections">
        <Link href="/discover/features" className={`${chip} ${section ? "bg-surface hover:bg-line" : "bg-foreground text-background"}`}>
          All
        </Link>
        {FEATURE_SECTIONS.map((s) => (
          <Link
            key={s.id}
            href={`/discover/features/${s.id}`}
            className={`${chip} ${section === s.id ? "bg-foreground text-background" : "bg-surface hover:bg-line"}`}
          >
            {s.label}
          </Link>
        ))}
      </nav>

      {!lead ? (
        <p className="py-10 text-muted">No stories here yet. We&apos;re out looking for great work.</p>
      ) : (
        <>
          <FeatureHero feature={lead} priority />
          {rest.length > 0 && (
            <ShowMore
              className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3"
              items={rest.map((f) => (
                <FeatureCard key={f.id} feature={f} />
              ))}
            />
          )}
        </>
      )}
    </main>
  );
}
