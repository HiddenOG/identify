import type { NextConfig } from "next";

// Images uploaded to our Supabase Storage are resized, converted to WebP and cached by Next's
// image optimizer; other hosts (README images, GitHub cards) are shown as-is.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    remotePatterns: supabaseUrl ? [new URL(`${supabaseUrl}/storage/v1/object/public/**`)] : [],
    qualities: [75],
    // Uploaded files get a fresh name on every upload, so they can be cached for a long time.
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
  partialPrefetching: true,
  experimental: {
    // CV uploads go through a server action; files are capped at 5 MB in lib/import/extract-text.ts.
    serverActions: { bodySizeLimit: "6mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        // CSS Modules must keep their own pipeline; renaming them to *.css drops the scoped class names.
        condition: { not: { path: /\.module\.css$/ } },
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
