export const revalidate = 60;

import type { Metadata } from "next";
import { getPerformancesByLookup } from "@/lib/performances-by-lookup";
import {
  POPULAR_RIGHT_NOW_TARGETS,
  LEGENDARY_PERFORMANCE_TARGETS,
  RECENT_FAVORITES_TARGETS,
  allLandingRailLookupTargets,
} from "@/lib/performances-page-targets";
import { getPopularActors } from "@/lib/popular-actors";
import { DiscoverPageClient } from "./DiscoverPageClient";

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
  let performances: Awaited<ReturnType<typeof getPerformancesByLookup>> = [];
  let initialActors: Awaited<ReturnType<typeof getPopularActors>> = [];
  try {
    performances = await getPerformancesByLookup(allLandingRailLookupTargets());
  } catch {
    /* DB unreachable — client falls back to static rails / API */
  }

  try {
    initialActors = await getPopularActors(24);
  } catch {
    /* DB unreachable — client uses curated Familiar Faces fallback */
  }

  const byKey = (actor: string, movie: string) =>
    performances.find((p) => p.actor.name === actor && p.movie.title === movie);

  const initialPopular = POPULAR_RIGHT_NOW_TARGETS.map((t) =>
    byKey(t.actor, t.movie),
  ).filter((p): p is NonNullable<typeof p> => p !== undefined);

  const initialLegendary = LEGENDARY_PERFORMANCE_TARGETS.map((t) =>
    byKey(t.actor, t.movie),
  ).filter((p): p is NonNullable<typeof p> => p !== undefined);

  const initialRecent = RECENT_FAVORITES_TARGETS.map((t) =>
    byKey(t.actor, t.movie),
  ).filter((p): p is NonNullable<typeof p> => p !== undefined);

  return (
    <DiscoverPageClient
      initialPopular={initialPopular}
      initialLegendary={initialLegendary}
      initialRecent={initialRecent}
      initialActors={initialActors}
    />
  );
}
