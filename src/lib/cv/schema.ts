import { z } from "zod";

/**
 * The structured CV stored in profiles.cv. Every template renders this shape,
 * and both the form editor and the AI importer produce it.
 */
export const experienceSchema = z.object({
  role: z.string().max(120),
  company: z.string().max(120),
  location: z.string().max(80).default(""),
  period: z.string().max(40).default(""),
  highlights: z.array(z.string().max(400)).max(10).default([]),
});

export const educationSchema = z.object({
  title: z.string().max(160),
  meta: z.string().max(80).default(""),
});

/** Links render as <a href>, so only allow web URLs (no javascript: etc). Empty = not set. */
const webUrl = z
  .string()
  .trim()
  .max(200)
  .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Links must start with https://")
  .optional();

export const cvLinksSchema = z.object({
  email: z
    .string()
    .trim()
    .max(120)
    .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Enter a valid email.")
    .optional(),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine((v) => v === "" || /^[+\d][\d\s()-]{4,}$/.test(v), "Enter a valid phone number.")
    .optional(),
  linkedin: webUrl,
  github: webUrl,
  website: webUrl,
});

export const cvSchema = z.object({
  summary: z.string().max(2000).default(""),
  skills: z.array(z.string().max(160)).max(40).default([]),
  tools: z.array(z.string().max(40)).max(40).default([]),
  experience: z.array(experienceSchema).max(20).default([]),
  education: z.array(educationSchema).max(20).default([]),
  links: cvLinksSchema.default({}),
});

export type CV = z.infer<typeof cvSchema>;
export type Experience = z.infer<typeof experienceSchema>;
export type Education = z.infer<typeof educationSchema>;

/** Parses stored JSON, falling back to an empty CV if it is malformed. */
export function parseCV(raw: unknown): CV {
  const result = cvSchema.safeParse(raw ?? {});
  return result.success ? result.data : cvSchema.parse({});
}
