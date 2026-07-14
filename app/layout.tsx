import type { Metadata, Viewport } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import "./globals.css";

// Self-hosted at build by next/font (spec §13). Loaded as variable fonts, so no
// `weight` array is needed. No external font request ships → CSP font-src stays 'self'.
const display = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});
const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "protein-helper",
  title: "protein-helper",
  description:
    "Enter a protein target and see the serving of each food that hits it — with the calories that serving costs, its fiber, and a nutrient-density score, in raw or cooked weight.",
  robots: { index: false, follow: false },
  manifest: "/manifest.webmanifest",
  // The flexed-arm app icon is also the browser-tab favicon. SVG for modern
  // browsers, PNGs as fallback, and a PNG-in-ICO for the legacy /favicon.ico.
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  // Installed-app presentation (Android is primary; iOS honours these too). This is a
  // bare installable manifest + icons only — no service worker (spec Decision 7).
  appleWebApp: {
    capable: true,
    title: "protein-helper",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#0f120d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <div className="top-accent" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
