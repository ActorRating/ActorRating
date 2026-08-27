import {
  collectInternalEntityCrawlIds,
  collectInternalFleetIds,
  isEntityPath,
  isFleetContentPath,
  isFleetEligibleRow,
  matchesInternalEntityCrawl,
  matchesInternalFleetCrawl,
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
    ipHash?: string
    userId?: string | null
  },
) {
  return {
    id: `id-${i}`,
    path,
    referrer: opts?.referrer === undefined ? INTERNAL : opts.referrer,
    utmSource: opts?.utm ?? null,
    utmMedium: null as string | null,
    utmCampaign: null as string | null,
    createdAt: new Date(base.getTime() + (opts?.minutes ?? i) * 60_000),
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

test("same-IP guest hopping 4 /rate pages in 30m is an entity crawl", () => {
  const rows = [
    "/rate/norbit-2007/terry-crews",
    "/rate/norbit-2007/louis-price",
    "/rate/american-made-2017/april-billingsley",
    "/rate/be-cool-2005/nicole-scherzinger",
  ].map((path, i) =>
    fleetRow(i, path, { minutes: i * 6, ipHash: "same-ip" }),
  )
  expect(matchesInternalEntityCrawl(rows)).toBe(true)
  expect(collectInternalEntityCrawlIds(rows).size).toBe(4)
})

test("signed-in /rate hops are not an entity crawl", () => {
  const rows = Array.from({ length: 5 }, (_, i) =>
    fleetRow(i, `/rate/movie-${i}/actor-${i}`, {
      minutes: i * 5,
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
