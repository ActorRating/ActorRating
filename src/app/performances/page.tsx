import { unstable_cache } from "next/cache"
import { getPerformancesByLookup } from "@/lib/performances-by-lookup"
import { RECENT_PERFORMANCE_TARGETS, ICONIC_PERFORMANCE_TARGETS } from "@/lib/performances-page-targets"
import { PerformancesPageClient } from "./PerformancesPageClient"

const CACHE_KEY = "performances-page"
const REVALIDATE_SECONDS = 300

export default async function PerformancesPage() {
  const allTargets = [...RECENT_PERFORMANCE_TARGETS, ...ICONIC_PERFORMANCE_TARGETS]
  const performances = await unstable_cache(
    () => getPerformancesByLookup(allTargets),
    [CACHE_KEY],
    { revalidate: REVALIDATE_SECONDS }
  )()

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
