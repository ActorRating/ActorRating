/**
 * Discovery admin dashboard data — read-only aggregates.
 * Does NOT call X API.
 */

import { prisma } from "@/lib/prisma"
import {
  arieDiscoveryEnabled,
  arieDiscoveryIntervalMinutes,
  arieDiscoveryLookbackMinutes,
  arieDiscoveryMaxCandidatesPerRun,
  arieDiscoveryMaxSourcesPerRun,
} from "@/lib/arie/config"
import { observationalHealth } from "@/lib/arie/discovery/capabilities"

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export async function loadDiscoveryDashboard() {
  // Observational only — zero live X calls
  const health = observationalHealth()

  const lastRun = await prisma.arieDiscoveryRun.findFirst({
    orderBy: { startedAt: "desc" },
  })

  const lastSuccess = await prisma.arieDiscoveryRun.findFirst({
    where: { status: { in: ["SUCCESS", "PARTIAL", "NO_RESULTS"] } },
    orderBy: { startedAt: "desc" },
  })

  const lastRateLimited = await prisma.arieDiscoveryRun.findFirst({
    where: { status: "RATE_LIMITED" },
    orderBy: { startedAt: "desc" },
  })

  const from = startOfUtcDay()
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000)

  const todayCandidates = await prisma.arieDiscoveryCandidate.count({
    where: { lastSeenAt: { gte: from, lt: to } },
  })

  const todayUnique = await prisma.arieDiscoveryCandidate.groupBy({
    by: ["externalPostId"],
    where: { lastSeenAt: { gte: from, lt: to } },
  })

  const todayWorthAttention = await prisma.arieDiscoveryCandidate.count({
    where: {
      lastSeenAt: { gte: from, lt: to },
      scoutStatus: "eligible",
      originalScore: { gte: 65 },
    },
  })

  const todayExceptional = await prisma.arieDiscoveryCandidate.count({
    where: {
      lastSeenAt: { gte: from, lt: to },
      scoutStatus: "eligible",
      originalScore: { gte: 85 },
    },
  })

  const todayWithDraft = await prisma.arieOpportunity.count({
    where: {
      contentType: "original",
      createdAt: { gte: from, lt: to },
      finalDraft: { not: null },
      inboundEvent: { discoveryMethod: { not: null } },
    },
  })

  const todayQaReady = await prisma.arieOpportunity.count({
    where: {
      contentType: "original",
      createdAt: { gte: from, lt: to },
      originalStatus: "QA_PASSED",
      inboundEvent: { discoveryMethod: { not: null } },
    },
  })

  const sources = await prisma.arieDiscoverySource.findMany({
    orderBy: [{ enabled: "desc" }, { priority: "desc" }],
  })

  const sourceStats = await Promise.all(
    sources.map(async (s) => {
      const candidates = await prisma.arieDiscoveryCandidate.count({
        where: { discoverySourceId: s.id, lastSeenAt: { gte: from, lt: to } },
      })
      const opportunities = await prisma.arieDiscoveryCandidate.count({
        where: {
          discoverySourceId: s.id,
          lastSeenAt: { gte: from, lt: to },
          scoutStatus: "eligible",
        },
      })
      return {
        id: s.id,
        handle: s.handle,
        query: s.query,
        sourceType: s.sourceType,
        enabled: s.enabled,
        priority: s.priority,
        lastPolledAt: s.lastPolledAt?.toISOString() ?? null,
        lastError: s.lastError,
        todayCandidates: candidates,
        todayOpportunities: opportunities,
      }
    }),
  )

  const recentCandidates = await prisma.arieDiscoveryCandidate.findMany({
    orderBy: { lastSeenAt: "desc" },
    take: 30,
    include: {
      source: { select: { handle: true, query: true, sourceType: true } },
    },
  })

  return {
    enabled: arieDiscoveryEnabled(),
    provider: "X",
    config: {
      maxCandidatesPerRun: arieDiscoveryMaxCandidatesPerRun(),
      maxSourcesPerRun: arieDiscoveryMaxSourcesPerRun(),
      lookbackMinutes: arieDiscoveryLookbackMinutes(),
      intervalMinutes: arieDiscoveryIntervalMinutes(),
    },
    health: {
      ...health,
      // Expose full capability states (available|unavailable|unknown)
      capabilityStates: health.capabilities,
      probeMode: "observational" as const,
    },
    lastRun: lastRun
      ? {
          id: lastRun.id,
          status: lastRun.status,
          startedAt: lastRun.startedAt.toISOString(),
          completedAt: lastRun.completedAt?.toISOString() ?? null,
          candidatesFound: lastRun.candidatesFound,
          candidatesDeduped: lastRun.candidatesDeduped,
          candidatesIngested: lastRun.candidatesIngested,
          candidatesRetried: lastRun.candidatesRetried,
          scoutExcluded: lastRun.scoutExcluded,
          opportunityEligible: lastRun.opportunityEligible,
          opportunitiesCreated: lastRun.opportunitiesCreated,
          opportunityDeduped: lastRun.opportunityDeduped,
          inboundCreated: lastRun.inboundCreated,
          inboundDeduped: lastRun.inboundDeduped,
          errors: lastRun.errors,
          rateLimitInfo: lastRun.rateLimitInfo,
          capabilitySnapshot: lastRun.capabilitySnapshot,
        }
      : null,
    lastSuccessfulRun: lastSuccess
      ? {
          id: lastSuccess.id,
          status: lastSuccess.status,
          startedAt: lastSuccess.startedAt.toISOString(),
        }
      : null,
    lastRateLimitedRun: lastRateLimited
      ? {
          id: lastRateLimited.id,
          startedAt: lastRateLimited.startedAt.toISOString(),
        }
      : null,
    today: {
      discovered: todayCandidates,
      uniquePosts: todayUnique.length,
      worthAttention: todayWorthAttention,
      exceptional: todayExceptional,
      withDraft: todayWithDraft,
      qaReady: todayQaReady,
    },
    sources: sourceStats,
    recentCandidates: recentCandidates.map((c) => ({
      id: c.id,
      authorHandle: c.authorHandle,
      text: c.text.slice(0, 280),
      sourcePublishedAt: c.sourcePublishedAt?.toISOString() ?? null,
      discoveredAt: c.discoveredAt.toISOString(),
      lastSeenAt: c.lastSeenAt.toISOString(),
      source: c.source?.handle
        ? `@${c.source.handle}`
        : c.source?.query
          ? c.source.query.slice(0, 60)
          : null,
      discoveryMethod: c.discoveryMethod,
      discoveryPriority: c.discoveryPriority,
      velocityStatus: c.velocityStatus,
      publicMetrics: c.publicMetrics,
      dedupeState: c.dedupeState,
      ingestStatus: c.ingestStatus,
      scoutStatus: c.scoutStatus,
      originalScore: c.originalScore,
      sourceUrl: c.sourceUrl,
      opportunityId: c.opportunityId,
    })),
  }
}

export async function loadDiscoveryStatsForIntelligence(day = new Date()) {
  const from = startOfUtcDay(day)
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000)

  const scanned = await prisma.arieDiscoveryCandidate.count({
    where: { lastSeenAt: { gte: from, lt: to } },
  })

  return { scanned, from: from.toISOString().slice(0, 10) }
}
