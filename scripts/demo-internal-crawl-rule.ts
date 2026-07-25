/**
 * Quick checks for internal-crawl bot detection (no DB).
 *   npx tsx scripts/demo-internal-crawl-rule.ts
 */
import {
  collectInternalCrawlIds,
  collectInternalFleetIds,
  isInternalOnlyNoUtm,
  isInternalSiteReferrer,
  matchesInternalFleetCrawl,
  matchesInternalPathCrawl,
} from "../src/lib/analytics/internal-crawl"

const base = new Date("2026-07-25T12:00:00.000Z")

function row(
  i: number,
  path: string,
  opts?: { referrer?: string | null; utm?: string | null; minutes?: number },
) {
  return {
    id: `id-${i}`,
    path,
    referrer: opts?.referrer === undefined ? "https://actorrating.com/rate/foo" : opts.referrer,
    utmSource: opts?.utm ?? null,
    utmMedium: null as string | null,
    utmCampaign: null as string | null,
    createdAt: new Date(base.getTime() + (opts?.minutes ?? i) * 60_000),
  }
}

console.log("isInternalSiteReferrer(null)", isInternalSiteReferrer(null))
console.log(
  "isInternalSiteReferrer(actorrating)",
  isInternalSiteReferrer("https://www.actorrating.com/movies/x"),
)
console.log(
  "isInternalSiteReferrer(tiktok)",
  isInternalSiteReferrer("https://www.tiktok.com/@x"),
)
console.log(
  "isInternalOnlyNoUtm internal",
  isInternalOnlyNoUtm({ referrer: "https://actorrating.com/", utmSource: null }),
)
console.log(
  "isInternalOnlyNoUtm with utm",
  isInternalOnlyNoUtm({
    referrer: "https://actorrating.com/",
    utmSource: "tiktok",
  }),
)

const crawlRows = Array.from({ length: 16 }, (_, i) =>
  row(i, `/rate/movie-${i}/actor-${i}`, { minutes: i * 0.5 }),
)
console.log(
  "\n16 distinct internal paths in 8 min → crawl?",
  matchesInternalPathCrawl(crawlRows),
)

const withDirect = [
  row(0, "/a", { referrer: null, minutes: 0 }),
  ...Array.from({ length: 16 }, (_, i) => row(i + 1, `/p-${i}`, { minutes: i + 1 })),
]
console.log(
  "includes null referrer in window → crawl?",
  matchesInternalPathCrawl(withDirect),
)

const fifteen = Array.from({ length: 15 }, (_, i) => row(i, `/only-${i}`, { minutes: i }))
console.log(
  "exactly 15 distinct (not more than 15) → crawl?",
  matchesInternalPathCrawl(fifteen),
)

console.log("collectInternalCrawlIds count", collectInternalCrawlIds(crawlRows).size)

const fleetRows = Array.from({ length: 50 }, (_, i) => ({
  id: `f-${i}`,
  path: `/rate/movie-${i}/actor-${i}`,
  referrer: "https://actorrating.com/",
  utmSource: null as string | null,
  utmMedium: null as string | null,
  utmCampaign: null as string | null,
  createdAt: new Date(base.getTime() + i * 5_000),
  ipHash: `ip-${i}`,
  userId: null as string | null,
}))
console.log(
  "\n50 IPs / 50 paths / 50 views in ~4 min → fleet?",
  matchesInternalFleetCrawl(fleetRows.map((r) => ({ path: r.path, ipHash: r.ipHash }))),
)
console.log("collectInternalFleetIds count", collectInternalFleetIds(fleetRows).size)

const smallFleet = Array.from({ length: 20 }, (_, i) => ({
  id: `s-${i}`,
  path: `/p-${i}`,
  referrer: "https://actorrating.com/",
  utmSource: null as string | null,
  utmMedium: null as string | null,
  utmCampaign: null as string | null,
  createdAt: new Date(base.getTime() + i * 5_000),
  ipHash: `sip-${i}`,
  userId: null as string | null,
}))
console.log(
  "20 IPs (below threshold) → fleet?",
  matchesInternalFleetCrawl(smallFleet.map((r) => ({ path: r.path, ipHash: r.ipHash }))),
)
