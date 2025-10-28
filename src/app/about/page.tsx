// src/app/page.tsx (Server Component - no "use client")
import { Metadata } from "next";
import { HomeLayout } from "@/components/layout";
import HomePageClient from "@/components/HomePageClient";

// --- SEO Metadata ---
export const metadata: Metadata = {
  title: "ActorRating - Rate Acting Performances, Not Just Movies",
  description: "Join ActorRating, the world's first community-driven platform to rate and analyze acting performances using Oscar-inspired criteria. Discover, rate, and explore detailed performance insights.",
  keywords: [
    "actor rating",
    "rate actors",
    "acting performance ratings",
    "movie actor reviews",
    "best acting performances",
    "rate movie performances",
  ],
  openGraph: {
    title: "ActorRating - Rate Acting Performances",
    description: "The community-driven platform for rating acting performances using Oscar-inspired criteria.",
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
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ActorRating - Rate Acting Performances",
    description: "Join the community rating acting performances with Oscar-inspired criteria.",
    images: ["https://www.actorrating.com/logo.png"],
  },
};

export default function HomePage() {
  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ActorRating",
    url: "https://www.actorrating.com",
    description: "Community-driven platform for rating acting performances",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.actorrating.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <HomeLayout>
        <HomePageClient />
      </HomeLayout>
    </>
  );
}