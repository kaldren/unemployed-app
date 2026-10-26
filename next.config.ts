import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // e2e runs its own dev server in .next-e2e, next to the one you run in .next.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  cacheComponents: true,
  partialPrefetching: true,
  typedRoutes: true,
  experimental: {
    // Resume PDFs are up to 5 MB, plus multipart overhead.
    serverActions: { bodySizeLimit: "6mb" },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
