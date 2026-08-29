import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { PwaSupport } from "@/components/pwa-support";
import { PwaStatus } from "@/components/pwa-status";

// Geometric humanist sans — heavy display weights for the oversized
// numerals, and tabular figures that keep money columns from jittering.
const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Garage Manager",
  description: "Simple garage management for a single-owner workshop",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Garage Manager",
    startupImage: [{ url: "/icon-512x512.png" }],
  },
  icons: {
    // 180x180 is the size iOS actually asks for; pointing this at the 192
    // Android icon made the device rescale it on every home-screen add.
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  applicationName: "Garage Manager",
};

export const viewport: Viewport = {
  themeColor: "#efe9dc",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-[var(--canvas)] font-sans text-[var(--ink)]" suppressHydrationWarning>
        <Providers>
          <PwaStatus />
          {children}
          <PwaSupport />
        </Providers>
      </body>
    </html>
  );
}
