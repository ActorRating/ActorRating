import type { Metadata } from "next";
import { loadLandingRails } from "@/lib/landing-daily-rails";
import { getPopularActors } from "@/lib/popular-actors";
import { DiscoverPageClient } from "./DiscoverPageClient";
import { DiscoverTopRatedPerformancesSection } from "@/components/TopRatedPerformancesSection";
// ISR ~1h for top-rated community links (loader cache matches).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Discover Acting Performances",
  description:
    "Search and browse acting performances to rate. Popular, legendary, and recent favorites — plus familiar faces and the full catalog via search.",
  robots: { index: true, follow: true },
  alternates: {
    canonical: "https://actorrating.com/discover",
  },
};

export default async function DiscoverPage() {
  let initialPopular: Awaited<ReturnType<typeof loadLandingRails>>["popular"] = [];
  let initialLegendary: Awaited<ReturnType<typeof loadLandingRails>>["legendary"] = [];
  let initialRecent: Awaited<ReturnType<typeof loadLandingRails>>["recent"] = [];
  let initialActors: Awaited<ReturnType<typeof getPopularActors>> = [];
  try {
    const rails = await loadLandingRails();
    initialPopular = rails.popular;
    initialLegendary = rails.legendary;
    initialRecent = rails.recent;
  } catch {
    /* DB unreachable — client falls back to static rails / API */
  }

  try {
    initialActors = await getPopularActors(24);
  } catch {
    /* DB unreachable — client uses curated Familiar Faces fallback */
  }

  return (
    <>
      <DiscoverPageClient
        initialPopular={initialPopular}
        initialLegendary={initialLegendary}
        initialRecent={initialRecent}
        initialActors={initialActors}
      />
      {/* Throws on DB failure rather than rendering an empty top-rated block. */}
      <DiscoverTopRatedPerformancesSection />
    </>
  );
}
