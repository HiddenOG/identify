import { z } from "zod";

/** Fonts a CV can use. Each maps to a CSS variable set up by next/font in src/lib/fonts.ts. */
export const FONT_OPTIONS = {
  montserrat: { label: "Montserrat", cssVar: "var(--font-montserrat)" },
  "space-grotesk": { label: "Space Grotesk", cssVar: "var(--font-space-grotesk)" },
  "dm-sans": { label: "DM Sans", cssVar: "var(--font-dm-sans)" },
  lora: { label: "Lora (serif)", cssVar: "var(--font-lora)" },
} as const;

export type FontKey = keyof typeof FONT_OPTIONS;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/);

/** Stored in profiles.theme. Every field is optional; missing values fall back to the preset. */
export const themeSchema = z.object({
  preset: z.string().optional(),
  accent: hex.optional(),
  ink: hex.optional(),
  paper: hex.optional(),
  font: z.enum(Object.keys(FONT_OPTIONS) as [FontKey, ...FontKey[]]).optional(),
});

export type ThemeInput = z.infer<typeof themeSchema>;

export type Theme = {
  accent: string;
  ink: string;
  paper: string;
  font: FontKey;
};

/** Starter color schemes. "lime" is the original portfolio look. */
export const THEME_PRESETS: Record<string, Theme & { label: string }> = {
  lime: { label: "Lime", accent: "#a3ef6b", ink: "#0a0a0a", paper: "#efeef1", font: "montserrat" },
  sky: { label: "Sky", accent: "#7dd3fc", ink: "#0b1220", paper: "#f1f5f9", font: "space-grotesk" },
  coral: { label: "Coral", accent: "#fda4af", ink: "#1c1917", paper: "#faf5f0", font: "dm-sans" },
  amber: { label: "Amber", accent: "#fcd34d", ink: "#111111", paper: "#fbfaf7", font: "lora" },
  violet: { label: "Violet", accent: "#c4b5fd", ink: "#13111c", paper: "#f4f3f8", font: "space-grotesk" },
};

export const DEFAULT_PRESET = "lime";

export function resolveTheme(raw: unknown): Theme {
  const parsed = themeSchema.safeParse(raw ?? {});
  const input = parsed.success ? parsed.data : {};
  const base = THEME_PRESETS[input.preset ?? DEFAULT_PRESET] ?? THEME_PRESETS[DEFAULT_PRESET];
  return {
    accent: input.accent ?? base.accent,
    ink: input.ink ?? base.ink,
    paper: input.paper ?? base.paper,
    font: input.font ?? base.font,
  };
}
