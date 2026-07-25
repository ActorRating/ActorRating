import type { PrismaClient } from "@prisma/client"

/** More than this many distinct paths in the window → crawl signal. */
export const INTERNAL_CRAWL_MIN_DISTINCT_PATHS = 15
export const INTERNAL_CRAWL_WINDOW_MS = 10 * 60 * 1000

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

export type InternalCrawlSample = {
  id?: string
  path: string
  referrer?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null
  createdAt?: Date
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
