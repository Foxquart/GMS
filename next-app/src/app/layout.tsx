import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/lib/providers";
import { PwaSupport } from "@/components/pwa-support";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
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
    apple: [{ url: "/icon-192x192.png", sizes: "192x192", type: "image/png" }],
  },
  applicationName: "Garage Manager",
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full bg-[#f1f3f5] font-sans text-[#0f172a]" suppressHydrationWarning>
        <Providers>
          {children}
          <PwaSupport />
        </Providers>
      </body>
    </html>
  );
}