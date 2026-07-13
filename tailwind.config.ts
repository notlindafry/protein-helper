import type { Config } from "tailwindcss";

// Palette lives in app/globals.css :root (spec §9). Components reference it through
// Tailwind arbitrary values (e.g. bg-[var(--surface)], text-[var(--text)]). Only the
// font families are surfaced as named utilities here so `font-display` / `font-body`
// map to the next/font CSS variables.
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "system-ui", "sans-serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      maxWidth: {
        content: "var(--maxw)",
      },
      borderRadius: {
        DEFAULT: "var(--radius)",
        sm: "var(--radius-sm)",
      },
    },
  },
  plugins: [],
};

export default config;
