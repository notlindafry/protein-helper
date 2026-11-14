import nextCoreWebVitals from "eslint-config-next/core-web-vitals";

// Flat config (ESLint 9). Next 16 removed `next lint`; this replaces .eslintrc.json
// with the same "next/core-web-vitals" ruleset, run through the ESLint CLI.
const config = [
  ...nextCoreWebVitals,
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
];

export default config;
