// src/app/page.tsx (Server Component)
import { Metadata } from "next";
import { LandingLayout } from "@/components/layout";
import HomePageClient from "@/components/HomePageClient";

// --- SEO Metadata ---
export const metadata: Metadata = {
  title: "ActorRating - Rate Acting Performances, Not Just Movies",
  description: "Rate and analyze acting performances using Oscar-inspired criteria. Join our community platform to discover acclaimed performances from cinema history.",
  keywords: [
    "actor rating", "acting performance", "movie ratings", "community-driven ratings",
    "Oscar-inspired criteria", "film performance analysis", "rate actors", "cinema"
  ],
  openGraph: {
    title: "ActorRating - Rate Acting Performances",
    description: "Community-driven platform to rate and analyze acting performances with professional criteria.",
    url: "https://actorrating.com",
    siteName: "ActorRating",
    images: [
      {
        url: "https://actorrating.com/logo.png",
        width: 1200,
        height: 630,
        alt: "ActorRating - Rate Acting Performances",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ActorRating - Rate Acting Performances",
    description: "Community-driven platform to rate and analyze acting performances with professional criteria.",
    images: ["https://actorrating.com/logo.png"],
  },
};

export default function Home() {
  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ActorRating",
    url: "https://actorrating.com",
    description: "Community-driven platform for rating acting performances",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://actorrating.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LandingLayout>
        <HomePageClient />
      </LandingLayout>
    </>
  );
}