import type { MetadataRoute } from "next";

// Ask every crawler not to crawl the site. v4 drops the v2 Vercel Password Protection
// (spec §Security: this is a public, no-PII nutrition table), so the URL is publicly
// reachable. This robots rule, the noindex <meta> (app/layout.tsx), and the
// X-Robots-Tag header (next.config.mjs) keep it out of search indexes; there is no
// auth gate and nothing sensitive to protect.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
