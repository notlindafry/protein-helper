import type { MetadataRoute } from "next";

// Web app manifest → served at /manifest.webmanifest. A BARE installable manifest
// (name, 192 + 512 icons, start_url, standalone) so the app can sit on a phone home
// screen for kitchen use. No service worker and no offline caching (spec Decision 7);
// modern Chrome/Safari allow "Add to Home Screen" from the manifest alone.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "protein-helper",
    short_name: "protein-helper",
    description:
      "Enter a protein target and see the serving of each food that hits it, in raw or cooked weight.",
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
