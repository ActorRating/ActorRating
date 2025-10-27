import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { CookieConsentProvider } from "@/components/providers/CookieConsentProvider";
import RouteChangeScroll from "@/components/layout/RouteChangeScroll";
import ChunkErrorReload from "@/components/layout/ChunkErrorReload";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Remove extra display fonts to reduce CSS and font payload

export const metadata: Metadata = {
  title: "Actor Rating",
  description: "Rate and discover your favorite actors",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logos/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/logos/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/logos/favicon.ico", sizes: "any" }
    ],
    apple: [
      { url: "/logos/apple-touch-icon.png", sizes: "180x180", type: "image/png" }
    ],
    other: [
      { url: "/logos/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/logos/android-chrome-512x512.png", sizes: "512x512", type: "image/png" }
    ]
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent"
  }
};

// Next.js 15+ expects themeColor under viewport
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {/* Preconnects for critical external resources */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        {/* Supabase Session Provider */}
        <SessionProvider>
          <CookieConsentProvider>
            <Suspense fallback={null}>
              <RouteChangeScroll />
            </Suspense>
            <ChunkErrorReload />
            <Suspense fallback={null}>
              {children}
            </Suspense>
          </CookieConsentProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
