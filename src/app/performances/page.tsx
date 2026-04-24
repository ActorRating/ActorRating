export const revalidate = 60;

import type { Metadata } from "next"
import { getPerformancesByLookup } from "@/lib/performances-by-lookup"

export const metadata: Metadata = {
  title: "All Acting Performances Ranked",
  description:
    "Browse all acting performances rated by users. Discover the best performances across movies and actors.",
}
import { RECENT_PERFORMANCE_TARGETS, ICONIC_PERFORMANCE_TARGETS } from "@/lib/performances-page-targets"
import { PerformancesPageClient } from "./PerformancesPageClient"

export default async function PerformancesPage() {
  const allTargets = [...RECENT_PERFORMANCE_TARGETS, ...ICONIC_PERFORMANCE_TARGETS]
  const performances = await getPerformancesByLookup(allTargets)

  const initialRecent = RECENT_PERFORMANCE_TARGETS.map((target) =>
    performances.find((p) => p.actor.name === target.actor && p.movie.title === target.movie)
  ).filter((p): p is NonNullable<typeof p> => p !== undefined)

  const initialIconic = ICONIC_PERFORMANCE_TARGETS.map((target) =>
    performances.find((p) => p.actor.name === target.actor && p.movie.title === target.movie)
  ).filter((p): p is NonNullable<typeof p> => p !== undefined)

  return (
    <PerformancesPageClient
      initialRecent={initialRecent}
      initialIconic={initialIconic}
    />
  )
}
