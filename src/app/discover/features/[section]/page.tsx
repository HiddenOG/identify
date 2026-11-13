import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FEATURE_SECTIONS, isFeatureSection, sectionInfo } from "@/lib/features";
import { FeaturesView } from "../features-view";

export function generateStaticParams() {
  return FEATURE_SECTIONS.map((s) => ({ section: s.id }));
}

export async function generateMetadata({ params }: PageProps<"/discover/features/[section]">): Promise<Metadata> {
  const { section } = await params;
  if (!isFeatureSection(section)) return {};
  const info = sectionInfo(section);
  return { title: `${info.label} · Discover projects`, description: info.blurb };
}

export default async function DiscoveriesSectionPage({ params }: PageProps<"/discover/features/[section]">) {
  const { section } = await params;
  if (!isFeatureSection(section)) notFound();
  return <FeaturesView section={section} />;
}
