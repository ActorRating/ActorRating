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
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
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
        {/* SessionProvider is client-only; wrap in Suspense already below */}
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
