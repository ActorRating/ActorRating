/**
 * Quick checks for internal-crawl bot detection (no DB).
 *   npx tsx scripts/demo-internal-crawl-rule.ts
 */
import {
  collectInternalCrawlIds,
  collectInternalEntityCrawlIds,
  collectInternalFleetIds,
  isInternalOnlyNoUtm,
  isInternalSiteReferrer,
  matchesInternalEntityCrawl,
  matchesInternalFleetCrawl,
  matchesInternalPathCrawl,
} from "../src/lib/analytics/internal-crawl"

const base = new Date("2026-07-25T12:00:00.000Z")

function row(
  i: number,
  path: string,
  opts?: { referrer?: string | null; utm?: string | null; minutes?: number; userId?: string | null },
) {
  return {
    id: `id-${i}`,
    path,
    referrer: opts?.referrer === undefined ? "https://actorrating.com/rate/foo" : opts.referrer,
    utmSource: opts?.utm ?? null,
    utmMedium: null as string | null,
    utmCampaign: null as string | null,
    createdAt: new Date(base.getTime() + (opts?.minutes ?? i) * 60_000),
    userId: opts?.userId ?? null,
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

const crawlRows = Array.from({ length: 7 }, (_, i) =>
  row(i, `/rate/movie-${i}/actor-${i}`, { minutes: i * 0.5 }),
)
console.log(
  "\n7 distinct internal paths in ~3 min → crawl?",
  matchesInternalPathCrawl(crawlRows),
)

const withDirect = [
  row(0, "/a", { referrer: null, minutes: 0 }),
  ...Array.from({ length: 7 }, (_, i) => row(i + 1, `/p-${i}`, { minutes: i + 1 })),
]
console.log(
  "includes null referrer in window → crawl?",
  matchesInternalPathCrawl(withDirect),
)

const six = Array.from({ length: 6 }, (_, i) => row(i, `/only-${i}`, { minutes: i }))
console.log(
  "exactly 6 distinct (not more than 6) → crawl?",
  matchesInternalPathCrawl(six),
)

console.log("collectInternalCrawlIds count", collectInternalCrawlIds(crawlRows).size)

const entityRows = Array.from({ length: 4 }, (_, i) =>
  row(i, `/actors/obscure-actor-${i}`, { minutes: i * 5 }),
)
console.log(
  "\n4 distinct /actors internal guest hops → entity crawl?",
  matchesInternalEntityCrawl(entityRows),
)
console.log(
  "collectInternalEntityCrawlIds count",
  collectInternalEntityCrawlIds(entityRows).size,
)

const signedInEntity = Array.from({ length: 5 }, (_, i) =>
  row(i, `/actors/a-${i}`, { minutes: i, userId: "user-1" }),
)
console.log(
  "signed-in entity hops → collect entity ids?",
  collectInternalEntityCrawlIds(signedInEntity).size,
)

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

const smallFleet = Array.from({ length: 7 }, (_, i) => ({
  id: `s-${i}`,
  path: `/actors/obscure-${i}`,
  referrer: "https://actorrating.com/",
  utmSource: null as string | null,
  utmMedium: null as string | null,
  utmCampaign: null as string | null,
  createdAt: new Date(base.getTime() + i * 5_000),
  ipHash: `sip-${i}`,
  userId: null as string | null,
}))
console.log(
  "7 IPs (below threshold) → fleet?",
  matchesInternalFleetCrawl(smallFleet.map((r) => ({ path: r.path, ipHash: r.ipHash }))),
)

const slowDrip = Array.from({ length: 8 }, (_, i) => ({
  id: `d-${i}`,
  path: i % 2 === 0 ? `/actors/drip-${i}` : `/rate/movie-${i}/actor-${i}`,
  referrer: "https://actorrating.com/",
  utmSource: null as string | null,
  utmMedium: null as string | null,
  utmCampaign: null as string | null,
  createdAt: new Date(base.getTime() + i * 5 * 60_000),
  ipHash: `dip-${i}`,
  userId: null as string | null,
}))
console.log(
  "8 IPs /rate+/actors every 5 min → fleet?",
  matchesInternalFleetCrawl(slowDrip.map((r) => ({ path: r.path, ipHash: r.ipHash }))),
)
console.log("collectInternalFleetIds slow drip", collectInternalFleetIds(slowDrip).size)

const rateEntity = Array.from({ length: 4 }, (_, i) =>
  row(i, `/rate/movie-${i}/actor-${i}`, { minutes: i * 6 }),
)
console.log(
  "4 distinct /rate internal guest hops → entity crawl?",
  matchesInternalEntityCrawl(rateEntity),
)
