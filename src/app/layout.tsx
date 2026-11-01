import type { Metadata } from "next";
import { Suspense } from "react";
import Script from "next/script";
import { Geist, Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { buildDevNextAuthSession, isDevMode } from "@/lib/devAuth";
import { CookieConsentProvider } from "@/components/providers/CookieConsentProvider";
import { NavigationProgressProvider } from "@/components/providers/NavigationProgressProvider";
import { MixpanelAnalyticsProvider } from "@/components/providers/MixpanelAnalyticsProvider";
import RouteChangeScroll from "@/components/layout/RouteChangeScroll";
import ChunkErrorReload from "@/components/layout/ChunkErrorReload";
import { SearchPreloadTrigger } from "@/components/SearchPreloadTrigger";
import { GaPageViewTracker } from "@/components/analytics/GaPageViewTracker";
import { FirstPartyPageViewTracker } from "@/components/analytics/FirstPartyPageViewTracker";
import { QualifiedVisitTracker } from "@/components/analytics/QualifiedVisitTracker";
import { GOOGLE_ADS_ID } from "@/lib/analytics/google-ads";
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_OG_IMAGE_URL,
  TWITTER_CREATOR,
} from "@/lib/seo/social";

/** Production GA4 property — override via NEXT_PUBLIC_GA_ID when needed. */
const GA_MEASUREMENT_ID =
  process.env.NEXT_PUBLIC_GA_ID?.trim() || "G-C3JQQH5F83";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant-garamond",
  subsets: ["latin"],
  // Display headings use 400/600/700; drop unused 300/500 to cut font bytes.
  weight: ["400", "600", "700"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  metadataBase: new URL("https://actorrating.com"),
  title: {
    default: "ActorRating — Acting Performance Ratings & Reviews",
    template: "%s | ActorRating",
  },
  description:
    "Rate and discover acting performances across 570K+ performances and 208K+ actors. Quick single-slider or 5-criteria ratings. Community-driven, growing daily.",
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
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
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
    title: "ActorRating — Acting Performance Ratings & Reviews",
    description:
      "Community-driven platform to rate 570K+ performances and 208K+ actors. Quick rate or 5-criteria breakdown. Discover and rank the best acting performances.",
    url: "https://actorrating.com",
    siteName: "ActorRating",
    images: [DEFAULT_OG_IMAGE],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ActorRating — Acting Performance Ratings & Reviews",
    description:
      "Rate 570K+ performances and 208K+ actors. Quick single-slider or 5-criteria ratings. Join the community.",
    images: [DEFAULT_OG_IMAGE_URL],
    creator: TWITTER_CREATOR,
  },
  other: {
    "apple-mobile-web-app-capable": "yes",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent", // Allows content behind status bar
    "viewport-fit": "cover", // CRITICAL: iOS safe area support
  },
};

// ✅ Modern Next.js viewport handling with iOS safe area support
export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#000000",
  viewportFit: "cover", // CRITICAL: Allows content to extend into safe areas on iOS
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = isDevMode ? buildDevNextAuthSession() : null;

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${cormorantGaramond.variable}`}
    >
      <head>
        {/*
          GA4 in the root layout so every route inherits it (rate/movie/actor/
          stories/news included). Loaded via next/script afterInteractive.
        */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga4-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}', {
              page_path: window.location.pathname,
              send_page_view: true,
            });
            gtag('config', '${GOOGLE_ADS_ID}');
          `}
        </Script>
        <Script
          src="https://cloud.umami.is/script.js"
          data-website-id="6ceba783-497c-448d-ba13-4ae2ff2872a1"
          strategy="afterInteractive"
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {/* App Providers */}
        <SessionProvider session={session}>
          <CookieConsentProvider>
            <MixpanelAnalyticsProvider>
              <NavigationProgressProvider>
                <Suspense fallback={null}>
                  <RouteChangeScroll />
                </Suspense>
                <Suspense fallback={null}>
                  <GaPageViewTracker measurementId={GA_MEASUREMENT_ID} />
                </Suspense>
                <Suspense fallback={null}>
                  <FirstPartyPageViewTracker />
                </Suspense>
                <Suspense fallback={null}>
                  <QualifiedVisitTracker />
                </Suspense>
                <SearchPreloadTrigger />
                <ChunkErrorReload />
                {/*
                  Do NOT wrap {children} in <Suspense>: it makes Next stream the whole
                  page into `<div hidden id="S:n">` chunks that only a JS swap reveals.
                  Crawlers that skip JS (SEO tools, AI bots) then see an empty body, and
                  notFound() can no longer change the HTTP status (soft-404s).
                  Same rule for loading.tsx on indexable routes.
                */}
                {children}
              </NavigationProgressProvider>
            </MixpanelAnalyticsProvider>
          </CookieConsentProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
