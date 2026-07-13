import type { MetadataRoute } from "next";

// Ask every crawler not to crawl the site. This is defence in depth: the
// deployment is gated by Vercel Password Protection (spec §12 Option A), so
// unauthenticated bots receive a 401 and never reach content in the first place.
// Combined with the noindex <meta> (app/layout.tsx) and the X-Robots-Tag header
// (next.config.mjs), the URL should not surface in web search.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
