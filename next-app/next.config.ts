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