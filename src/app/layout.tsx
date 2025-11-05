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

// ✅ Enhanced SEO Metadata
export const metadata: Metadata = {
  title: "ActorRating – Rate Acting Performances, Not Just Movies",
  description:
    "ActorRating is the world's first community-driven platform to rate and analyze acting performances using Oscar-inspired criteria. Discover, rate, and explore detailed performance insights.",
  keywords: [
    "actor rating",
    "actors rating",
    "rate acting",
    "rate actors",
    "movie performance ratings",
    "acting performance analysis",
    "Oscar-inspired ratings",
    "cinema acting reviews",
    "actor performance scores",
    "film acting database",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/logos/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/logos/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/logos/favicon.ico", sizes: "any" },
    ],
    apple: [
      { url: "/logos/apple-touch-icon-V2.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { url: "/logos/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/logos/android-chrome-512x512.png", sizes: "512x512", type: "image/png" },
    ],
  },
  openGraph: {
    title: "ActorRating – Rate Acting Performances",
    description:
      "Community-driven platform to rate and analyze acting performances using Oscar-inspired criteria. Discover your favorite actors' best performances.",
    url: "https://www.actorrating.com",
    siteName: "ActorRating",
    images: [
      {
        url: "https://www.actorrating.com/logo.png",
        width: 1200,
        height: 630,
        alt: "ActorRating Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ActorRating – Rate Acting Performances",
    description:
      "Join the world’s first platform for rating and analyzing acting performances using professional criteria.",
    images: ["https://www.actorrating.com/logo.png"],
    creator: "@ActorRating",
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

// ✅ Modern Next.js viewport handling
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
        {/* App Providers */}
        <SessionProvider>
          <CookieConsentProvider>
            <Suspense fallback={null}>
              <RouteChangeScroll />
            </Suspense>
            <ChunkErrorReload />
            <Suspense fallback={null}>{children}</Suspense>
          </CookieConsentProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
