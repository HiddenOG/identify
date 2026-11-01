import type { CV } from "@/lib/cv/schema";
import type { ProfileView } from "@/lib/profiles";
import type { Theme } from "@/lib/themes";

/** A project card as shown on a CV page. Filled from the projects table in Stage 2. */
export type CVProject = {
  title: string;
  summary: string | null;
  coverUrl: string | null;
  href: string;
  demoUrl: string | null;
  repoUrl: string | null;
};

/** Every CV template receives exactly these props. */
export type TemplateProps = {
  profile: ProfileView;
  cv: CV;
  theme: Theme;
  projects: CVProject[];
};
