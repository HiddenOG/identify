import { ClassicTemplate } from "./classic-template";
import type { TemplateProps } from "./types";

/** Registry of CV templates. Add new styles here (Stage 6). */
export const TEMPLATES = {
  classic: { label: "Classic", component: ClassicTemplate },
} as const;

export type TemplateKey = keyof typeof TEMPLATES;

export function RenderTemplate({ template, ...props }: TemplateProps & { template: string }) {
  const entry = TEMPLATES[template as TemplateKey] ?? TEMPLATES.classic;
  const Component = entry.component;
  return <Component {...props} />;
}
