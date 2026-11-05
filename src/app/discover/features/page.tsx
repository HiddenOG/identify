import type { Metadata } from "next";
import { FeaturesView } from "./features-view";

export const metadata: Metadata = {
  title: "Discoveries",
  description: "Stories behind exceptional work we found on the internet: the builders, the projects and the rising.",
};

export default function DiscoveriesPage() {
  return <FeaturesView />;
}
