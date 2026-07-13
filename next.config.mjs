/** @type {import('next').NextConfig} */

// Content-Security-Policy for a static, self-contained app:
// - No third-party origins: scripts, styles, fonts, and data are all same-origin.
// - next/font self-hosts the fonts at build time, so font-src can stay 'self'
//   (no external font request → no SECURITY TODO needed for fonts, per spec §13).
// - The app makes no runtime nutrition/API calls, so connect-src is 'self'.
//
// SECURITY TODO: script-src / style-src use 'unsafe-inline' because Next.js App
// Router emits small inline bootstrap/RSC-streaming scripts and next/font injects
// an inline <style>. Tightening these to a per-request nonce would require adding
// Next middleware to generate and thread the nonce; deliberately not done here to
// keep the deployment middleware-free (auth is handled by Vercel Password
// Protection at the platform edge — spec §12 Option A). Revisit if third-party
// scripts are ever introduced.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data:",
  "font-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  // Keep the deployment out of search indexes on every response, including
  // non-HTML assets that can't carry a <meta robots> tag. The real guarantee is
  // Vercel Password Protection (spec §12 Option A) — unauthenticated crawlers get
  // a 401 and never see content; this header covers compliant bots as defence in
  // depth and any window where protection is off.
  { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
