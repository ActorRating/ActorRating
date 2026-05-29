export const revalidate = 60;

// src/app/page.tsx (Server Component)
import { Metadata } from "next";
import { LandingLayout } from "@/components/layout";
import HomePageClient from "@/components/HomePageClient";
import HomeSeoLinkSections from "@/components/HomeSeoLinkSections";
import { getPerformancesByLookup } from "@/lib/performances-by-lookup";
import { buildWeeklyFeaturedHero } from "@/lib/home-featured-performance";
import { homeLeaderboardLookupTargets } from "@/lib/performances-page-targets";
import { getCurrentWeeklyHeroConfig, weeklyHeroLookupTarget } from "@/lib/weekly-hero-performance";

// --- SEO Metadata ---
export const metadata: Metadata = {
  title: { absolute: "ActorRating — Rate Acting Performances Scene by Scene" },
  description: "Rate 570K+ acting performances and 208K+ actors. Quick single-slider or 5-criteria ratings. Compare performances and see who truly deserved the awards.",
  keywords: [
    "actor rating", "acting performance", "movie ratings", "community-driven ratings",
    "Oscar-inspired criteria", "film performance analysis", "rate actors", "cinema", "quick rate"
  ],
  openGraph: {
    title: "ActorRating — Rate Acting Performances Scene by Scene",
    description: "Rate 570K+ performances and 208K+ actors. Quick rate or 5-criteria breakdown. Compare actors and see who truly deserved the awards.",
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
    title: "ActorRating — Rate Acting Performances Scene by Scene",
    description: "Rate 570K+ performances and 208K+ actors. Quick single-slider or 5-criteria. Compare and see who deserved the awards.",
    images: ["https://actorrating.com/logo.png"],
  },
};

export default async function Home() {
  const weeklyConfig = getCurrentWeeklyHeroConfig();
  let initialLeaderboardPerformances: Awaited<ReturnType<typeof getPerformancesByLookup>> = [];
  let featuredHero = buildWeeklyFeaturedHero(weeklyConfig, null);
  try {
    const [weeklyRows, leaderboardRows] = await Promise.all([
      getPerformancesByLookup([weeklyHeroLookupTarget()]),
      getPerformancesByLookup(homeLeaderboardLookupTargets()),
    ]);
    initialLeaderboardPerformances = leaderboardRows;
    featuredHero = buildWeeklyFeaturedHero(weeklyConfig, weeklyRows[0] ?? null);
  } catch {
    /* DB/API unavailable during build or deploy — client still fetches */
  }
  const primaryRateHref = featuredHero.rateHref;
  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "ActorRating",
    url: "https://actorrating.com",
    description: "Community-driven platform for rating 570K+ acting performances and 208K+ actors. Quick single-slider or 5-criteria ratings.",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://actorrating.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  // FAQ Schema for AI Q&A optimization
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is ActorRating?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "ActorRating is a community-driven platform to rate and analyze 570K+ acting performances and 208K+ actors. Rate with a quick single slider or across five Oscar-inspired criteria: emotional range, character believability, technical skill, screen presence, and chemistry."
        }
      },
      {
        "@type": "Question",
        name: "How does ActorRating work?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Users select an actor's performance in a film, then rate it with a quick single-slider score or across five criteria: Emotional Range & Depth, Character Believability, Technical Skill & Authenticity, Screen Presence & Impact, and Chemistry & Interaction. Scores are aggregated for comprehensive performance ratings."
        }
      },
      {
        "@type": "Question",
        name: "What makes ActorRating different from other rating platforms?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Unlike platforms like IMDB or Rotten Tomatoes that rate entire films, ActorRating focuses exclusively on individual acting performances. This allows for nuanced evaluation of an actor's work, separating great performances from mediocre films and vice versa."
        }
      },
      {
        "@type": "Question",
        name: "Who can rate performances on ActorRating?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Anyone can create a free account and start rating performances. Our community-driven approach ensures diverse perspectives while maintaining quality through standardized criteria."
        }
      }
    ]
  };

  // HowTo Schema for instruction content
  const howToSchema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Rate Acting Performances on ActorRating",
    description: "Step-by-step guide to rating an actor's performance: quick single slider or 5 Oscar-inspired criteria",
    step: [
      {
        "@type": "HowToStep",
        name: "Select an Actor's Performance",
        text: "Choose an actor and a specific film role from 570K+ performances to rate",
        position: 1
      },
      {
        "@type": "HowToStep",
        name: "Rate: Quick or 5 Criteria",
        text: "Use the quick single-slider score or evaluate across: Emotional Range & Depth, Character Believability, Technical Skill & Authenticity, Screen Presence & Impact, and Chemistry & Interaction",
        position: 2
      },
      {
        "@type": "HowToStep",
        name: "View Aggregated Scores",
        text: "See how your rating compares with the community and view comprehensive performance analytics",
        position: 3
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }}
      />
      <LandingLayout primaryRateHref={primaryRateHref}>
        <HomePageClient
          initialLeaderboardPerformances={initialLeaderboardPerformances}
          featuredHero={featuredHero}
          primaryRateHref={primaryRateHref}
        />
        <HomeSeoLinkSections />
      </LandingLayout>
    </>
  );
}