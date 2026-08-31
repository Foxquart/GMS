import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  serverExternalPackages: ["@electric-sql/pglite", "pg", "pdfkit", "@pdfkit/fontkit"],
  /**
   * The invoice PDF embeds Inter from `src/server/assets/fonts` — PDFKit's
   * built-in Helvetica has no rupee glyph. Nothing imports those files, so
   * output tracing cannot see them and a traced build would ship without
   * them, silently dropping the invoice back to the "Rs." fallback.
   */
  outputFileTracingIncludes: {
    "/api/invoices/[id]/pdf": ["./src/server/assets/fonts/*.ttf"],
    "/api/share/[token]/pdf": ["./src/server/assets/fonts/*.ttf"],
  },
  /**
   * Categories are no longer a page of their own — the grid, its
   * sub-categories and the parts list all live on /inventory. Redirecting
   * before the render keeps old bookmarks, the PWA's cached shell and any
   * link still pointing here working, without shipping a page that exists
   * only to bounce.
   */
  async redirects() {
    return [
      { source: "/inventory/categories", destination: "/inventory", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;