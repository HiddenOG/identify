import { StoriesDirectory } from "@/components/discover/stories-directory";
import { getCachedFeatures } from "@/lib/discover/cached";
import type { FeatureSection } from "@/lib/features";
import { hasSupabaseEnv } from "@/lib/supabase/env";

/** Discover projects: every story, with section tabs; a section URL opens on that tab. */
export async function FeaturesView({ section }: { section?: FeatureSection }) {
  const features = hasSupabaseEnv ? await getCachedFeatures(undefined, 200) : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-serif text-4xl font-bold sm:text-5xl">Discover projects</h1>
      <p className="mt-2 mb-8 text-lg text-muted">The stories behind exceptional work we found on the internet.</p>
      <StoriesDirectory features={features} initial={section} />
    </main>
  );
}
