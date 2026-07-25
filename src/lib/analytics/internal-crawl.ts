import type { PrismaClient } from "@prisma/client"

/** Per-IP: more than this many distinct paths in the window → crawl signal. */
export const INTERNAL_CRAWL_MIN_DISTINCT_PATHS = 15
export const INTERNAL_CRAWL_WINDOW_MS = 10 * 60 * 1000

/**
 * Fleet (rotating IPs): site-wide internal-only / no-UTM traffic in 10m with
 * many distinct IPs + paths. Per-IP rule misses this (diag: 845 IPs, ≤3 paths each).
 */
export const FLEET_MIN_DISTINCT_IPS = 25
export const FLEET_MIN_DISTINCT_PATHS = 25
export const FLEET_MIN_VIEWS = 40
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

/** Rows we count/flag for fleet detection (skip logged-in users + admin). */
export function isFleetEligibleRow(fields: {
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
      stats.views > minViews &&
      stats.distinctIps > minIps &&
      stats.distinctPaths > minPaths
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
 * Load last 10m of pageviews for ipHash, merge with current (not yet saved).
 * Returns whether to flag bot + sibling ids already in DB to mark.
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
  },
): Promise<{ isCrawl: boolean; siblingIds: string[] }> {
  if (!isInternalOnlyNoUtm(current)) {
    return { isCrawl: false, siblingIds: [] }
  }

  const since = new Date(Date.now() - INTERNAL_CRAWL_WINDOW_MS)
  const recent = await prisma.pageView.findMany({
    where: {
      ipHash,
      createdAt: { gte: since },
    },
    select: {
      id: true,
      path: true,
      referrer: true,
      utmSource: true,
      utmMedium: true,
      utmCampaign: true,
    },
  })

  const samples: InternalCrawlSample[] = [
    ...recent,
    {
      path: current.path,
      referrer: current.referrer,
      utmSource: current.utmSource,
      utmMedium: current.utmMedium,
      utmCampaign: current.utmCampaign,
    },
  ]

  if (!matchesInternalPathCrawl(samples)) {
    return { isCrawl: false, siblingIds: [] }
  }

  return {
    isCrawl: true,
    siblingIds: recent.map((r) => r.id),
  }
}

/**
 * Site-wide rotating-IP fleet: many IPs + many paths, all internal/no-UTM, in 10m.
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

  const since = new Date(Date.now() - INTERNAL_CRAWL_WINDOW_MS)
  const recent = await prisma.pageView.findMany({
    where: { createdAt: { gte: since } },
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
  }>,
  opts?: { minDistinctPaths?: number; windowMs?: number },
): Set<string> {
  const windowMs = opts?.windowMs ?? INTERNAL_CRAWL_WINDOW_MS
  const minDistinct = opts?.minDistinctPaths ?? INTERNAL_CRAWL_MIN_DISTINCT_PATHS
  const flagged = new Set<string>()
  if (rows.length === 0) return flagged

  const sorted = [...rows].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  let left = 0

  for (let right = 0; right < sorted.length; right++) {
    const rightTime = sorted[right].createdAt.getTime()
    while (left <= right && rightTime - sorted[left].createdAt.getTime() > windowMs) {
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
  const windowMs = opts?.windowMs ?? INTERNAL_CRAWL_WINDOW_MS
  const flagged = new Set<string>()
  const eligible = rows.filter((r) => isFleetEligibleRow(r))
  if (eligible.length === 0) return flagged

  const sorted = [...eligible].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
  let left = 0

  for (let right = 0; right < sorted.length; right++) {
    const rightTime = sorted[right].createdAt.getTime()
    while (left <= right && rightTime - sorted[left].createdAt.getTime() > windowMs) {
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
