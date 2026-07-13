import type { MetadataRoute } from "next";

// Web app manifest → served at /manifest.webmanifest (spec: installable PWA,
// Android-first). Meets Chrome/Android installability: name, 192 + 512 icons,
// start_url, standalone display — paired with a fetch-handling service worker
// (public/sw.js, registered in components/InstallPwa.tsx).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "gains-helper",
    short_name: "gains-helper",
    description:
      "Enter a protein goal and see each food scaled to the serving that hits it on its own.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f120d",
    theme_color: "#0f120d",
    categories: ["health", "food", "utilities"],
    icons: [
      // "any" — used as the app icon where the platform does not mask.
      { src: "/icons/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // "maskable" — Android adaptive icons. The artwork keeps its subject inside
      // the safe zone, so it survives circle/squircle masks without clipping.
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
