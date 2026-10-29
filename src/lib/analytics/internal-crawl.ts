import type { PrismaClient } from "@prisma/client"

/**
 * Per-IP: more than this many distinct paths in the window → crawl signal.
 * Softened by human-engagement exemption (qualified_visit / rating / etc.).
 */
export const INTERNAL_CRAWL_MIN_DISTINCT_PATHS = 6
export const INTERNAL_CRAWL_WINDOW_MS = 10 * 60 * 1000

/**
 * Guest entity hop crawl: high distinct count AND machine-speed cadence.
 * Was ≥4 paths / 30m (false-positived engaged humans). Now ≥12 paths with
 * median inter-pageview gap under ~3s.
 */
export const INTERNAL_ENTITY_CRAWL_MIN_PATHS = 12
export const INTERNAL_ENTITY_CRAWL_WINDOW_MS = 30 * 60 * 1000
/** Median gap between consecutive pageviews must be strictly under this. */
export const INTERNAL_ENTITY_CRAWL_MAX_MEDIAN_GAP_MS = 3_000

/** Lookback for human signals that exempt path/entity crawl (and trigger unflag). */
export const HUMAN_ENGAGEMENT_LOOKBACK_MS = 24 * 60 * 60 * 1000

const ENTITY_PATH_RE = /^\/(actors|directors)\/[^/]+\/?$/i
const RATE_PATH_RE = /^\/rate\/[^/]+\/[^/]+\/?$/i
const MOVIE_PATH_RE = /^\/movies\/[^/]+\/?$/i

/**
 * Fleet (rotating IPs): site-wide internal-only / no-UTM long-tail hops.
 * Unchanged — path/entity softening does not apply here.
 */
export const FLEET_WINDOW_MS = 60 * 60 * 1000
export const FLEET_MIN_DISTINCT_IPS = 8
export const FLEET_MIN_DISTINCT_PATHS = 8
export const FLEET_MIN_VIEWS = 8
/** Soft cadence: most IPs should be light (≤ this many views in the window). */
export const FLEET_LIGHT_IP_MAX_VIEWS = 5
/** Share of IPs that must be "light" for the window to count as a rotating fleet. */
export const FLEET_MIN_LIGHT_IP_RATIO = 0.7

const DEFAULT_INTERNAL_HOSTS = new Set(["actorrating.com"])

function siteHosts(): Set<string> {
  const hosts = new Set(DEFAULT_INTERNAL_HOSTS)
  const base = process.env.NEXT_PUBLIC_BASE_URL?.trim()
  if (base) {
    try {
      const h = new URL(base).hostname.replace(/^www\./i, "").toLowerCase()
      if (h) hosts.add(h)
    } catch {
      // ignore bad BASE_URL
    }
  }
  return hosts
}

/** True when referrer is our own site (not null/direct, not external). */
export function isInternalSiteReferrer(referrer: string | null | undefined): boolean {
  const raw = referrer?.trim()
  if (!raw) return false
  try {
    const host = new URL(raw).hostname.replace(/^www\./i, "").toLowerCase()
    return siteHosts().has(host)
  } catch {
    return false
  }
}

export function hasUtmParams(fields: {
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
}): boolean {
  return Boolean(
    fields.utmSource?.trim() ||
      fields.utmMedium?.trim() ||
      fields.utmCampaign?.trim(),
  )
}

/** Internal referrer + no UTMs — the crawl signature row shape. */
export function isInternalOnlyNoUtm(fields: {
  referrer?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
}): boolean {
  return isInternalSiteReferrer(fields.referrer) && !hasUtmParams(fields)
}

export function isEntityPath(path: string): boolean {
  const p = path.trim()
  return ENTITY_PATH_RE.test(p) || RATE_PATH_RE.test(p)
}

/** Long-tail content the rotating fleet actually crawls (not /, /search, /forum). */
export function isFleetContentPath(path: string): boolean {
  const p = path.trim()
  return isEntityPath(p) || MOVIE_PATH_RE.test(p)
}

/** Rows we count/flag for per-IP crawl (skip logged-in users + admin). */
export function isCrawlEligibleRow(fields: {
  path: string
  referrer?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  userId?: string | null
}): boolean {
  if (fields.path.startsWith("/admin")) return false
  if (fields.userId) return false
  return isInternalOnlyNoUtm(fields)
}

/** Fleet: crawl-eligible guests on actor/director/rate/movie pages only. */
export function isFleetEligibleRow(fields: {
  path: string
  referrer?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  userId?: string | null
}): boolean {
  return isCrawlEligibleRow(fields) && isFleetContentPath(fields.path)
}

export type InternalCrawlSample = {
  id?: string
  path: string
  referrer?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  createdAt?: Date
  ipHash?: string
  userId?: string | null
}

/**
 * Median of consecutive inter-arrival gaps. `timestamps` need not be pre-sorted.
 * Returns null when fewer than 2 timestamps.
 */
export function medianInterArrivalGapMs(timestamps: number[]): number | null {
  if (timestamps.length < 2) return null
  const sorted = [...timestamps].sort((a, b) => a - b)
  const gaps: number[] = []
  for (let i = 1; i < sorted.length; i++) {
    gaps.push(sorted[i]! - sorted[i - 1]!)
  }
  gaps.sort((a, b) => a - b)
  const mid = Math.floor(gaps.length / 2)
  if (gaps.length % 2 === 1) return gaps[mid]!
  return (gaps[mid - 1]! + gaps[mid]!) / 2
}

/**
 * Pure check: given samples for one ipHash in a time window,
 * is this an internal-only multi-path crawl?
 */
export function matchesInternalPathCrawl(
  samples: InternalCrawlSample[],
  opts?: { minDistinctPaths?: number },
): boolean {
  const minDistinct = opts?.minDistinctPaths ?? INTERNAL_CRAWL_MIN_DISTINCT_PATHS
  if (samples.length === 0) return false
  if (!samples.every((s) => isInternalOnlyNoUtm(s))) return false
  const distinct = new Set(samples.map((s) => s.path)).size
  return distinct > minDistinct
}

/**
 * Guest entity hop crawl: ≥N distinct entity paths AND machine-speed median gap.
 */
export function matchesInternalEntityCrawl(
  samples: InternalCrawlSample[],
  opts?: {
    minDistinctPaths?: number
    maxMedianGapMs?: number
  },
): boolean {
  const minDistinct = opts?.minDistinctPaths ?? INTERNAL_ENTITY_CRAWL_MIN_PATHS
  const maxMedianGap =
    opts?.maxMedianGapMs ?? INTERNAL_ENTITY_CRAWL_MAX_MEDIAN_GAP_MS
  if (samples.length === 0) return false
  if (!samples.every((s) => isCrawlEligibleRow(s))) return false
  const entityPaths = samples.filter((s) => isEntityPath(s.path)).map((s) => s.path)
  if (new Set(entityPaths).size < minDistinct) return false

  const times = samples
    .map((s) => s.createdAt?.getTime())
    .filter((t): t is number => typeof t === "number" && Number.isFinite(t))
  const median = medianInterArrivalGapMs(times)
  if (median == null) return false
  return median < maxMedianGap
}

export type FleetStats = {
  views: number
  distinctIps: number
  distinctPaths: number
}

export function fleetWindowStats(
  samples: Array<{ path: string; ipHash: string }>,
): FleetStats {
  return {
    views: samples.length,
    distinctIps: new Set(samples.map((s) => s.ipHash)).size,
    distinctPaths: new Set(samples.map((s) => s.path)).size,
  }
}

export function matchesInternalFleetCrawl(
  samples: Array<{ path: string; ipHash: string }>,
  opts?: {
    minDistinctIps?: number
    minDistinctPaths?: number
    minViews?: number
    lightIpMaxViews?: number
    minLightIpRatio?: number
  },
): boolean {
  const minIps = opts?.minDistinctIps ?? FLEET_MIN_DISTINCT_IPS
  const minPaths = opts?.minDistinctPaths ?? FLEET_MIN_DISTINCT_PATHS
  const minViews = opts?.minViews ?? FLEET_MIN_VIEWS
  const lightMax = opts?.lightIpMaxViews ?? FLEET_LIGHT_IP_MAX_VIEWS
  const minLightRatio = opts?.minLightIpRatio ?? FLEET_MIN_LIGHT_IP_RATIO
  const stats = fleetWindowStats(samples)
  if (
    !(
      stats.views >= minViews &&
      stats.distinctIps >= minIps &&
      stats.distinctPaths >= minPaths
    )
  ) {
    return false
  }

  // Cadence: rotating fleet = handful of hits per IP for most IPs
  // (one heavy real browser in the window must not poison detection).
  const perIp = new Map<string, number>()
  for (const s of samples) {
    perIp.set(s.ipHash, (perIp.get(s.ipHash) || 0) + 1)
  }
  let light = 0
  for (const count of perIp.values()) {
    if (count <= lightMax) light += 1
  }
  return light / perIp.size >= minLightRatio
}

/**
 * True when this IP has a recent human product signal (or a rating/signup
 * tied to a user seen on this IP). Exempts path + entity crawl only.
 */
export async function hasHumanEngagementSignal(
  prisma: PrismaClient,
  ipHash: string,
  visitorId?: string | null,
): Promise<boolean> {
  const since = new Date(Date.now() - HUMAN_ENGAGEMENT_LOOKBACK_MS)
  const identity = visitorId ? { OR: [{ ipHash }, { visitorId }] } : { ipHash }

  const event = await prisma.productEvent.findFirst({
    where: {
      AND: [
        identity,
        {
          OR: [
            { name: "qualified_visit" },
            { name: "rating_submitted" },
            { name: "signup_started" },
            { name: "hub_rate_click" },
            { name: { startsWith: "faceoff_" } },
          ],
        },
      ],
      createdAt: { gte: since },
    },
    select: { id: true },
  })
  if (event) return true

  // Engaged pageview (dwell + interaction written back) on this visitor or IP.
  const engaged = await prisma.pageView.findFirst({
    where: { ...identity, engaged: true, createdAt: { gte: since } },
    select: { id: true },
  })
  if (engaged) return true

  const userRows = await prisma.pageView.findMany({
    where: {
      ipHash,
      userId: { not: null },
      createdAt: { gte: since },
    },
    select: { userId: true },
    distinct: ["userId"],
    take: 50,
  })
  const userIds = userRows
    .map((r) => r.userId)
    .filter((id): id is string => typeof id === "string" && id.length > 0)
  if (userIds.length === 0) return false

  const [rating, signup] = await Promise.all([
    prisma.rating.findFirst({
      where: { userId: { in: userIds }, createdAt: { gte: since } },
      select: { id: true },
    }),
    prisma.user.findFirst({
      where: { id: { in: userIds }, createdAt: { gte: since } },
      select: { id: true },
    }),
  ])
  return Boolean(rating || signup)
}

/**
 * Crawl-eligible PageView ids for this IP in the engagement lookback that are
 * currently bot-flagged — candidates to restore to human when exempted.
 */
export async function listUnflagableCrawlPageViewIds(
  prisma: PrismaClient,
  ipHash: string,
  visitorId?: string | null,
): Promise<string[]> {
  const since = new Date(Date.now() - HUMAN_ENGAGEMENT_LOOKBACK_MS)
  const rows = await prisma.pageView.findMany({
    where: {
      ...(visitorId ? { OR: [{ ipHash }, { visitorId }] } : { ipHash }),
      isLikelyBot: true,
      createdAt: { gte: since },
      userId: null,
    },
    select: {
      id: true,
      path: true,
      referrer: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      userId: true,
      botReason: true,
    },
  })
  return rows
    .filter(
      (r) =>
        isCrawlEligibleRow(r) ||
        // Behavioural flags are reversible once the visitor proves human.
        // Keep in sync with isReversibleBotSuspectReason in bot-suspect.ts.
        (r.botReason != null &&
          /^(crawl_|reclassified_|internal_ref_new_visitor|cookie_less_burst)/.test(
            r.botReason,
          )),
    )
    .map((r) => r.id)
}

export async function unflagCrawlPageViews(
  prisma: PrismaClient,
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return
  await prisma.pageView.updateMany({
    where: { id: { in: ids } },
    data: { isLikelyBot: false, botCategory: null, botReason: null },
  })
}

export type PathEntityCrawlResult = {
  isCrawl: boolean
  siblingIds: string[]
}

/**
 * Load last 10m of pageviews for ipHash, merge with current (not yet saved).
 * Returns whether to flag bot + sibling ids already in DB to mark.
 * Skips when `humanExempt` (engagement signal in last 24h).
 */
export async function detectInternalPathCrawl(
  prisma: PrismaClient,
  ipHash: string,
  current: {
    path: string
    referrer: string | null
    utmSource: string | null
    utmMedium: string | null
    utmCampaign: string | null
    userId?: string | null
  },
  opts?: { humanExempt?: boolean },
): Promise<PathEntityCrawlResult> {
  if (opts?.humanExempt) {
    return { isCrawl: false, siblingIds: [] }
  }
  if (!isCrawlEligibleRow(current)) {
    return { isCrawl: false, siblingIds: [] }
  }

  const since = new Date(Date.now() - INTERNAL_CRAWL_WINDOW_MS)
  const recent = await prisma.pageView.findMany({
    where: {
      ipHash,
      createdAt: { gte: since },
      userId: null,
    },
    select: {
      id: true,
      path: true,
      referrer: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      userId: true,
      createdAt: true,
    },
  })

  const eligibleRecent = recent.filter((r) => isCrawlEligibleRow(r))
  const samples: InternalCrawlSample[] = [
    ...eligibleRecent,
    {
      path: current.path,
      referrer: current.referrer,
      utmSource: current.utmSource,
      utmMedium: current.utmMedium,
      utmCampaign: current.utmCampaign,
      userId: current.userId ?? null,
      createdAt: new Date(),
    },
  ]

  if (!matchesInternalPathCrawl(samples)) {
    return { isCrawl: false, siblingIds: [] }
  }

  return {
    isCrawl: true,
    siblingIds: eligibleRecent.map((r) => r.id),
  }
}

/**
 * Guest entity long-tail crawl over 30m (/actors|/directors|/rate).
 * Requires high distinct count + machine-speed median gap; skipped when exempt.
 */
export async function detectInternalEntityCrawl(
  prisma: PrismaClient,
  ipHash: string,
  current: {
    path: string
    referrer: string | null
    utmSource: string | null
    utmMedium: string | null
    utmCampaign: string | null
    userId?: string | null
  },
  opts?: { humanExempt?: boolean },
): Promise<PathEntityCrawlResult> {
  if (opts?.humanExempt) {
    return { isCrawl: false, siblingIds: [] }
  }
  if (!isCrawlEligibleRow(current) || !isEntityPath(current.path)) {
    return { isCrawl: false, siblingIds: [] }
  }

  const since = new Date(Date.now() - INTERNAL_ENTITY_CRAWL_WINDOW_MS)
  const recent = await prisma.pageView.findMany({
    where: {
      ipHash,
      createdAt: { gte: since },
      userId: null,
    },
    select: {
      id: true,
      path: true,
      referrer: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      userId: true,
      createdAt: true,
    },
  })

  const eligibleRecent = recent.filter((r) => isCrawlEligibleRow(r))
  const now = new Date()
  const samples: InternalCrawlSample[] = [
    ...eligibleRecent,
    {
      path: current.path,
      referrer: current.referrer,
      utmSource: current.utmSource,
      utmMedium: current.utmMedium,
      utmCampaign: current.utmCampaign,
      userId: current.userId ?? null,
      createdAt: now,
    },
  ]

  if (!matchesInternalEntityCrawl(samples)) {
    return { isCrawl: false, siblingIds: [] }
  }

  return {
    isCrawl: true,
    siblingIds: eligibleRecent.map((r) => r.id),
  }
}

/**
 * Site-wide rotating-IP fleet: many IPs + many long-tail paths, all internal/no-UTM, in 60m.
 */
export async function detectInternalFleetCrawl(
  prisma: PrismaClient,
  current: {
    path: string
    referrer: string | null
    utmSource: string | null
    utmMedium: string | null
    utmCampaign: string | null
    ipHash: string
    userId: string | null
  },
): Promise<{ isFleet: boolean; siblingIds: string[] }> {
  if (!isFleetEligibleRow(current)) {
    return { isFleet: false, siblingIds: [] }
  }

  const since = new Date(Date.now() - FLEET_WINDOW_MS)
  const recent = await prisma.pageView.findMany({
    where: { createdAt: { gte: since }, userId: null },
    select: {
      id: true,
      path: true,
      referrer: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
      ipHash: true,
      userId: true,
    },
  })

  const eligibleRecent = recent.filter((r) => isFleetEligibleRow(r))
  const samples = [
    ...eligibleRecent.map((r) => ({ path: r.path, ipHash: r.ipHash })),
    { path: current.path, ipHash: current.ipHash },
  ]

  if (!matchesInternalFleetCrawl(samples)) {
    return { isFleet: false, siblingIds: [] }
  }

  return {
    isFleet: true,
    siblingIds: eligibleRecent.map((r) => r.id),
  }
}

/**
 * Sliding-window scan over chronological samples for one ipHash.
 * Marks every row that falls in any 10m window matching the crawl rule.
 */
export function collectInternalCrawlIds(
  rows: Array<{
    id: string
    path: string
    referrer: string | null
    utmSource: string | null
    utmMedium: string | null
    utmCampaign: string | null
    createdAt: Date
    userId?: string | null
  }>,
  opts?: { minDistinctPaths?: number; windowMs?: number },
): Set<string> {
  const windowMs = opts?.windowMs ?? INTERNAL_CRAWL_WINDOW_MS
  const minDistinct = opts?.minDistinctPaths ?? INTERNAL_CRAWL_MIN_DISTINCT_PATHS
  const flagged = new Set<string>()
  const eligible = rows.filter((r) => isCrawlEligibleRow(r))
  if (eligible.length === 0) return flagged

  const sorted = [...eligible].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  let left = 0

  for (let right = 0; right < sorted.length; right++) {
    const rightTime = sorted[right]!.createdAt.getTime()
    while (left <= right && rightTime - sorted[left]!.createdAt.getTime() > windowMs) {
      left += 1
    }
    const window = sorted.slice(left, right + 1)
    if (matchesInternalPathCrawl(window, { minDistinctPaths: minDistinct })) {
      for (const row of window) flagged.add(row.id)
    }
  }

  return flagged
}

/**
 * Sliding-window entity crawl scan (30m, ≥12 distinct + machine-speed median gap).
 */
export function collectInternalEntityCrawlIds(
  rows: Array<{
    id: string
    path: string
    referrer: string | null
    utmSource: string | null
    utmMedium: string | null
    utmCampaign: string | null
    createdAt: Date
    userId?: string | null
  }>,
  opts?: {
    minDistinctPaths?: number
    windowMs?: number
    maxMedianGapMs?: number
  },
): Set<string> {
  const windowMs = opts?.windowMs ?? INTERNAL_ENTITY_CRAWL_WINDOW_MS
  const minDistinct = opts?.minDistinctPaths ?? INTERNAL_ENTITY_CRAWL_MIN_PATHS
  const flagged = new Set<string>()
  const eligible = rows.filter((r) => isCrawlEligibleRow(r))
  if (eligible.length === 0) return flagged

  const sorted = [...eligible].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  let left = 0

  for (let right = 0; right < sorted.length; right++) {
    const rightTime = sorted[right]!.createdAt.getTime()
    while (left <= right && rightTime - sorted[left]!.createdAt.getTime() > windowMs) {
      left += 1
    }
    const window = sorted.slice(left, right + 1)
    if (
      matchesInternalEntityCrawl(window, {
        minDistinctPaths: minDistinct,
        maxMedianGapMs: opts?.maxMedianGapMs,
      })
    ) {
      for (const row of window) flagged.add(row.id)
    }
  }

  return flagged
}

/**
 * Sliding-window fleet scan across all IPs. Flags fleet-eligible rows in matching windows.
 */
export function collectInternalFleetIds(
  rows: Array<{
    id: string
    path: string
    referrer: string | null
    utmSource: string | null
    utmMedium: string | null
    utmCampaign: string | null
    createdAt: Date
    ipHash: string
    userId?: string | null
  }>,
  opts?: {
    windowMs?: number
    minDistinctIps?: number
    minDistinctPaths?: number
    minViews?: number
  },
): Set<string> {
  const windowMs = opts?.windowMs ?? FLEET_WINDOW_MS
  const flagged = new Set<string>()
  const eligible = rows.filter((r) => isFleetEligibleRow(r))
  if (eligible.length === 0) return flagged

  const sorted = [...eligible].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  let left = 0

  for (let right = 0; right < sorted.length; right++) {
    const rightTime = sorted[right]!.createdAt.getTime()
    while (left <= right && rightTime - sorted[left]!.createdAt.getTime() > windowMs) {
      left += 1
    }
    const window = sorted.slice(left, right + 1)
    if (
      matchesInternalFleetCrawl(
        window.map((w) => ({ path: w.path, ipHash: w.ipHash })),
        opts,
      )
    ) {
      for (const row of window) flagged.add(row.id)
    }
  }

  return flagged
}
