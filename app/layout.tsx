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
  title: "Protein Target",
  description:
    "Enter a protein goal and see each food scaled to the serving that hits it on its own — with the calories, fat, carbs, and fiber that serving costs.",
  robots: { index: false, follow: false },
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
      <body>{children}</body>
    </html>
  );
}
