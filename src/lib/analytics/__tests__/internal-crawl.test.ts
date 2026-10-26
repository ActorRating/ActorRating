import {
  collectInternalEntityCrawlIds,
  collectInternalFleetIds,
  isEntityPath,
  isFleetContentPath,
  isFleetEligibleRow,
  listUnflagableCrawlPageViewIds,
  matchesInternalEntityCrawl,
  matchesInternalFleetCrawl,
  matchesInternalPathCrawl,
  medianInterArrivalGapMs,
  unflagCrawlPageViews,
  INTERNAL_ENTITY_CRAWL_MAX_MEDIAN_GAP_MS,
  INTERNAL_ENTITY_CRAWL_MIN_PATHS,
} from "@/lib/analytics/internal-crawl"

const INTERNAL = "https://actorrating.com/movies/inception-2010"
const GOOGLE = "https://www.google.com/"
const base = new Date("2026-08-27T10:00:00.000Z")

function fleetRow(
  i: number,
  path: string,
  opts?: {
    referrer?: string | null
    utm?: string | null
    minutes?: number
    seconds?: number
    ipHash?: string
    userId?: string | null
  },
) {
  const offsetMs =
    opts?.seconds != null
      ? opts.seconds * 1000
      : (opts?.minutes ?? i) * 60_000
  return {
    id: `id-${i}`,
    path,
    referrer: opts?.referrer === undefined ? INTERNAL : opts.referrer,
    utmSource: opts?.utm ?? null,
    utmMedium: null as string | null,
    utmCampaign: null as string | null,
    createdAt: new Date(base.getTime() + offsetMs),
    ipHash: opts?.ipHash ?? `ip-${i}`,
    userId: opts?.userId ?? null,
  }
}

test("isEntityPath includes /rate as well as /actors and /directors", () => {
  expect(isEntityPath("/actors/meryl-streep")).toBe(true)
  expect(isEntityPath("/directors/nolan")).toBe(true)
  expect(isEntityPath("/rate/norbit-2007/terry-crews")).toBe(true)
  expect(isEntityPath("/movies/inception-2010")).toBe(false)
  expect(isEntityPath("/search")).toBe(false)
})

test("isFleetContentPath is long-tail only", () => {
  expect(isFleetContentPath("/actors/jed-rees")).toBe(true)
  expect(isFleetContentPath("/rate/be-cool-2005/nicole-scherzinger")).toBe(true)
  expect(isFleetContentPath("/movies/the-dark-knight-2008")).toBe(true)
  expect(isFleetContentPath("/search")).toBe(false)
  expect(isFleetContentPath("/")).toBe(false)
  expect(isFleetContentPath("/forum")).toBe(false)
  expect(isFleetContentPath("/admin")).toBe(false)
})

test("isFleetEligibleRow requires guest + internal + no UTM + content path", () => {
  expect(
    isFleetEligibleRow({
      path: "/actors/lucas-raynaud",
      referrer: INTERNAL,
      userId: null,
    }),
  ).toBe(true)
  expect(
    isFleetEligibleRow({
      path: "/actors/lucas-raynaud",
      referrer: GOOGLE,
      userId: null,
    }),
  ).toBe(false)
  expect(
    isFleetEligibleRow({
      path: "/search",
      referrer: INTERNAL,
      userId: null,
    }),
  ).toBe(false)
  expect(
    isFleetEligibleRow({
      path: "/actors/lucas-raynaud",
      referrer: INTERNAL,
      userId: "user-1",
    }),
  ).toBe(false)
})

test("slow rotating /rate+/actors drip over ~40 min is a fleet", () => {
  const rows = [
    "/actors/mick-wingert",
    "/rate/norbit-2007/sara-sanderson",
    "/rate/madagascar-2005/bob-saget",
    "/rate/be-cool-2005/steven-tyler",
    "/rate/be-cool-2005/christina-milian",
    "/actors/jed-rees",
    "/rate/american-made-2017/daniel-lugo",
    "/rate/be-cool-2005/nicole-scherzinger",
  ].map((path, i) => fleetRow(i, path, { minutes: i * 5 }))

  expect(
    matchesInternalFleetCrawl(rows.map((r) => ({ path: r.path, ipHash: r.ipHash }))),
  ).toBe(true)
  expect(collectInternalFleetIds(rows).size).toBe(8)
})

test("7 rotating IPs stay under the fleet threshold", () => {
  const rows = Array.from({ length: 7 }, (_, i) =>
    fleetRow(i, `/actors/obscure-${i}`, { minutes: i * 5 }),
  )
  expect(
    matchesInternalFleetCrawl(rows.map((r) => ({ path: r.path, ipHash: r.ipHash }))),
  ).toBe(false)
  expect(collectInternalFleetIds(rows).size).toBe(0)
})

test("Google-referrer sessions are not fleet-eligible", () => {
  const rows = Array.from({ length: 10 }, (_, i) =>
    fleetRow(i, `/actors/star-${i}`, { minutes: i * 4, referrer: GOOGLE }),
  )
  expect(collectInternalFleetIds(rows).size).toBe(0)
})

test("internal /search and / hits do not count toward the fleet", () => {
  const rows = [
    ...Array.from({ length: 6 }, (_, i) => fleetRow(i, `/search`, { minutes: i * 4 })),
    ...Array.from({ length: 6 }, (_, i) =>
      fleetRow(i + 6, `/`, { minutes: (i + 6) * 4, ipHash: `home-${i}` }),
    ),
  ]
  expect(collectInternalFleetIds(rows).size).toBe(0)
})

test("signed-in /rate hops are not an entity crawl", () => {
  const rows = Array.from({ length: 15 }, (_, i) =>
    fleetRow(i, `/rate/movie-${i}/actor-${i}`, {
      seconds: i,
      ipHash: "same-ip",
      userId: "user-1",
    }),
  )
  expect(collectInternalEntityCrawlIds(rows).size).toBe(0)
})

test("fast burst of 50 rotating IPs still matches as a fleet", () => {
  const rows = Array.from({ length: 50 }, (_, i) =>
    fleetRow(i, `/rate/movie-${i}/actor-${i}`, { minutes: i * 0.1 }),
  )
  expect(
    matchesInternalFleetCrawl(rows.map((r) => ({ path: r.path, ipHash: r.ipHash }))),
  ).toBe(true)
  expect(collectInternalFleetIds(rows).size).toBe(50)
})

test("medianInterArrivalGapMs returns null / midpoints correctly", () => {
  expect(medianInterArrivalGapMs([])).toBeNull()
  expect(medianInterArrivalGapMs([1000])).toBeNull()
  expect(medianInterArrivalGapMs([0, 1000, 2000])).toBe(1000)
  // gaps 500, 2000, 1000 → sorted → median 1000
  expect(medianInterArrivalGapMs([0, 500, 2500, 3500])).toBe(1000)
  // even count: gaps 1000, 3000 → median 2000
  expect(medianInterArrivalGapMs([0, 1000, 4000])).toBe(2000)
})

test("human browsing 6 actor/rate pages over 10m with ~20s gaps is not flagged", () => {
  const rows = [
    "/actors/one",
    "/rate/m1/a1",
    "/actors/two",
    "/rate/m2/a2",
    "/actors/three",
    "/rate/m3/a3",
  ].map((path, i) =>
    fleetRow(i, path, { seconds: i * 20, ipHash: "human-ip" }),
  )

  expect(matchesInternalPathCrawl(rows)).toBe(false)
  expect(matchesInternalEntityCrawl(rows)).toBe(false)
  expect(collectInternalEntityCrawlIds(rows).size).toBe(0)
})

test("script hitting 15 entity pages at ~1s gaps is flagged as entity crawl", () => {
  expect(INTERNAL_ENTITY_CRAWL_MIN_PATHS).toBe(12)
  expect(INTERNAL_ENTITY_CRAWL_MAX_MEDIAN_GAP_MS).toBe(3_000)

  const rows = Array.from({ length: 15 }, (_, i) =>
    fleetRow(i, `/rate/movie-${i}/actor-${i}`, {
      seconds: i,
      ipHash: "script-ip",
    }),
  )

  expect(matchesInternalEntityCrawl(rows)).toBe(true)
  expect(collectInternalEntityCrawlIds(rows).size).toBe(15)
})

test("15 entity pages with human-paced gaps are not an entity crawl", () => {
  const rows = Array.from({ length: 15 }, (_, i) =>
    fleetRow(i, `/actors/star-${i}`, {
      seconds: i * 20,
      ipHash: "slow-script",
    }),
  )
  expect(matchesInternalEntityCrawl(rows)).toBe(false)
  expect(collectInternalEntityCrawlIds(rows).size).toBe(0)
})

test("4 slow /rate hops (old bar) are no longer an entity crawl", () => {
  const rows = [
    "/rate/norbit-2007/terry-crews",
    "/rate/norbit-2007/louis-price",
    "/rate/american-made-2017/april-billingsley",
    "/rate/be-cool-2005/nicole-scherzinger",
  ].map((path, i) =>
    fleetRow(i, path, { minutes: i * 6, ipHash: "same-ip" }),
  )
  expect(matchesInternalEntityCrawl(rows)).toBe(false)
  expect(collectInternalEntityCrawlIds(rows).size).toBe(0)
})

test("flagged IP that later rates is unflagged in the same pass", async () => {
  const flagged = [
    {
      id: "pv-1",
      path: "/actors/one",
      referrer: INTERNAL,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      userId: null,
      isLikelyBot: true,
    },
    {
      id: "pv-2",
      path: "/rate/m/a",
      referrer: INTERNAL,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      userId: null,
      isLikelyBot: true,
    },
    // External referrer — not crawl-eligible, leave flagged
    {
      id: "pv-bot-ua",
      path: "/actors/x",
      referrer: GOOGLE,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      userId: null,
      isLikelyBot: true,
    },
  ]

  const updateMany = jest.fn().mockResolvedValue({ count: 2 })
  const prisma = {
    pageView: {
      findMany: jest.fn().mockResolvedValue(flagged),
      updateMany,
    },
  }

  const ids = await listUnflagableCrawlPageViewIds(prisma as never, "ip-hash")
  expect(ids).toEqual(["pv-1", "pv-2"])
  await unflagCrawlPageViews(prisma as never, ids)
  expect(updateMany).toHaveBeenCalledWith({
    where: { id: { in: ["pv-1", "pv-2"] } },
    data: { isLikelyBot: false, botCategory: null, botReason: null },
  })
})
