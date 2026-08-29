import type { MetadataRoute } from "next";

/**
 * Colours here must match the running app, not a template. `theme_color`
 * paints the Android status bar and the splash screen behind the icon, so a
 * value the app never uses shows up as a coloured flash before the first
 * paint. These are `--canvas` and `--forest` from globals.css.
 */
const CANVAS = "#efe9dc";
const FOREST = "#22392c";

export default function manifest(): MetadataRoute.Manifest {
  return {
    // A stable id keeps an installed app attached to this entry even if
    // start_url later changes; without it the install can orphan itself.
    id: "/",
    name: "Garage Manager",
    short_name: "Garage",
    description: "Simple garage management for a single-owner workshop",
    // The query param is how installs show up separately in analytics;
    // `id` above is what keeps the app identity stable regardless.
    start_url: "/dashboard?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: CANVAS,
    theme_color: FOREST,
    orientation: "portrait",
    lang: "en",
    dir: "ltr",
    categories: ["business", "productivity"],
    icons: [
      { src: "/icon-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android masks the launcher icon to the device's shape. Without a
      // maskable variant it letterboxes the square one inside a white blob.
      {
        src: "/icon-maskable-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
    shortcuts: [
      { name: "Jobs", short_name: "Jobs", url: "/jobs", description: "Open and completed jobs" },
      { name: "Invoices", short_name: "Invoices", url: "/invoices", description: "Billing and payments" },
      {
        name: "Low stock",
        short_name: "Low stock",
        url: "/inventory/low-stock",
        description: "Parts below their shop minimum",
      },
    ],
  };
}
