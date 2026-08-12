/**
 * Discovery run orchestration — discover → dedupe → ingest → Scout (via original pipeline).
 * Read-only toward X. No Groq. No publish. No heatHint fabrication.
 */

import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import {
  arieDiscoveryEnabled,
  arieDiscoveryLookbackMinutes,
  arieDiscoveryMaxCandidatesPerRun,
  arieDiscoveryMaxSourcesPerRun,
} from "@/lib/arie/config"
import { arieLog } from "@/lib/arie/log"
import { ingestOriginalOpportunity } from "@/lib/arie/original-pipeline"
import { observationalHealth, shouldAttemptCapability } from "@/lib/arie/discovery/capabilities"
import { computeDiscoveryPriority, velocityStatusFromHistory } from "@/lib/arie/discovery/priority"
import { getXDiscoveryProvider } from "@/lib/arie/discovery/providers/x-provider"
import {
  listEnabledDiscoverySources,
  markSourcePolled,
  seedDiscoverySourcesIfEmpty,
} from "@/lib/arie/discovery/sources"
import type { DiscoveryRunStatus, RawDiscoveryPost } from "@/lib/arie/discovery/types"

const INGEST_LEASE_MS = 5 * 60_000

export type DiscoveryRunResult = {
  ok: boolean
  runId: string
  status: DiscoveryRunStatus
  reason?: string
  candidatesFound: number
  candidatesDeduped: number
  candidatesRetried: number
  candidatesIngested: number
  scoutExcluded: number
  opportunityEligible: number
  opportunitiesCreated: number
  opportunityDeduped: number
  inboundCreated: number
  inboundDeduped: number
}

type RunCounters = {
  candidatesFound: number
  candidatesDeduped: number
  candidatesRetried: number
  candidatesIngested: number
  scoutExcluded: number
  opportunityEligible: number
  opportunitiesCreated: number
  opportunityDeduped: number
  inboundCreated: number
  inboundDeduped: number
}

function isPrismaUniqueViolation(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: string }).code === "P2002"
  )
}

function deriveRunStatus(input: {
  errors: Array<{ code: string; rateLimited?: boolean }>
  candidatesFound: number
  hadSuccess: boolean
}): DiscoveryRunStatus {
  const anyRateLimit = input.errors.some((e) => e.rateLimited)
  const anyError = input.errors.length > 0

  if (!input.hadSuccess && anyRateLimit) return "RATE_LIMITED"
  if (!input.hadSuccess && anyError) return "ERROR"
  if (input.hadSuccess && anyError) return "PARTIAL"
  if (input.hadSuccess && input.candidatesFound === 0) return "NO_RESULTS"
  if (input.hadSuccess) return "SUCCESS"
  return "NO_RESULTS"
}

function needsIngest(candidate: {
  ingestStatus: string
  ingestLeaseUntil: Date | null
  opportunityId: string | null
}): boolean {
  if (candidate.ingestStatus === "INGESTED" && candidate.opportunityId) return false
  if (candidate.ingestStatus === "PENDING" || candidate.ingestStatus === "ERROR") return true
  if (candidate.ingestStatus === "INGESTING") {
    const lease = candidate.ingestLeaseUntil
    if (!lease || lease.getTime() < Date.now()) return true
    return false
  }
  // INGESTED without opportunity — crash recovery
  if (candidate.ingestStatus === "INGESTED" && !candidate.opportunityId) return true
  return true
}

async function upsertCandidate(input: {
  runId: string
  sourceId: string | null
  post: RawDiscoveryPost
  priority: number
}): Promise<{
  candidateId: string
  isNew: boolean
  shouldIngest: boolean
  retried: boolean
}> {
  const existing = await prisma.arieDiscoveryCandidate.findUnique({
    where: {
      provider_externalPostId: {
        provider: input.post.provider,
        externalPostId: input.post.externalPostId,
      },
    },
  })

  if (existing) {
    const retry = needsIngest(existing)
    await prisma.arieDiscoveryCandidate.update({
      where: { id: existing.id },
      data: {
        lastDiscoveryRunId: input.runId,
        lastSeenAt: new Date(),
        discoveryPriority: Math.max(existing.discoveryPriority, input.priority),
        publicMetrics: (input.post.publicMetrics ??
          existing.publicMetrics) as Prisma.InputJsonValue,
        authorHandle: existing.authorHandle ?? input.post.authorHandle,
        sourceUrl: existing.sourceUrl ?? input.post.sourceUrl,
        dedupeState: retry ? existing.dedupeState : "rediscovered",
        ...(input.post.authorHandle && !existing.authorHandle
          ? { authorHandle: input.post.authorHandle }
          : {}),
      },
    })
    return {
      candidateId: existing.id,
      isNew: false,
      shouldIngest: retry,
      retried: retry,
    }
  }

  try {
    const row = await prisma.arieDiscoveryCandidate.create({
      data: {
        provider: input.post.provider,
        externalPostId: input.post.externalPostId,
        authorHandle: input.post.authorHandle,
        authorId: input.post.authorId,
        text: input.post.text,
        sourceUrl: input.post.sourceUrl,
        sourcePublishedAt: input.post.sourcePublishedAt,
        discoveryMethod: input.post.discoveryMethod,
        discoveryRunId: input.runId,
        lastDiscoveryRunId: input.runId,
        discoverySourceId: input.sourceId,
        discoveryPriority: input.priority,
        velocityStatus: velocityStatusFromHistory(false),
        publicMetrics: (input.post.publicMetrics ?? undefined) as Prisma.InputJsonValue,
        dedupeState: "new",
        ingestStatus: "PENDING",
        scoutStatus: "pending",
      },
    })
    return { candidateId: row.id, isNew: true, shouldIngest: true, retried: false }
  } catch (err) {
    if (!isPrismaUniqueViolation(err)) throw err
    // Concurrent create — re-read and continue
    const raced = await prisma.arieDiscoveryCandidate.findUnique({
      where: {
        provider_externalPostId: {
          provider: input.post.provider,
          externalPostId: input.post.externalPostId,
        },
      },
    })
    if (!raced) throw err
    const retry = needsIngest(raced)
    await prisma.arieDiscoveryCandidate.update({
      where: { id: raced.id },
      data: {
        lastDiscoveryRunId: input.runId,
        lastSeenAt: new Date(),
        discoveryPriority: Math.max(raced.discoveryPriority, input.priority),
        dedupeState: "rediscovered",
      },
    })
    return {
      candidateId: raced.id,
      isNew: false,
      shouldIngest: retry,
      retried: retry,
    }
  }
}

async function claimForIngest(candidateId: string): Promise<boolean> {
  const now = new Date()
  const leaseUntil = new Date(now.getTime() + INGEST_LEASE_MS)
  const current = await prisma.arieDiscoveryCandidate.findUnique({
    where: { id: candidateId },
  })
  if (!current || !needsIngest(current)) return false

  await prisma.arieDiscoveryCandidate.update({
    where: { id: candidateId },
    data: {
      ingestStatus: "INGESTING",
      ingestStartedAt: now,
      ingestLeaseUntil: leaseUntil,
      ingestAttemptCount: { increment: 1 },
      lastIngestError: null,
    },
  })
  return true
}

function classifyScoutStatus(result: {
  eligible: boolean
  deduped: boolean
  originalScore: number
  reasonCodes?: string[]
}): {
  scoutStatus: string
  scoutExcluded: boolean
  opportunityEligible: boolean
} {
  if (result.deduped) {
    return { scoutStatus: "duplicate", scoutExcluded: false, opportunityEligible: false }
  }
  // Scout codes from original-score reasonCodes when available via re-check
  return {
    scoutStatus: result.eligible ? "eligible" : "score_ineligible",
    scoutExcluded: false,
    opportunityEligible: result.eligible,
  }
}

async function ingestCandidate(input: {
  candidateId: string
  runId: string
  post: RawDiscoveryPost
}): Promise<{
  ingested: boolean
  inboundCreated: boolean
  inboundDeduped: boolean
  opportunityCreated: boolean
  opportunityDeduped: boolean
  scoutExcluded: boolean
  opportunityEligible: boolean
  opportunityId?: string
  originalScore?: number
}> {
  const claimed = await claimForIngest(input.candidateId)
  if (!claimed) {
    return {
      ingested: false,
      inboundCreated: false,
      inboundDeduped: false,
      opportunityCreated: false,
      opportunityDeduped: false,
      scoutExcluded: false,
      opportunityEligible: false,
    }
  }

  // NEVER pass raw engagement as heatHint — velocity stays unknown without history.
  const result = await ingestOriginalOpportunity({
    text: input.post.text,
    authorHandle: input.post.authorHandle,
    authorId: input.post.authorId,
    externalId: input.post.externalPostId,
    sourceUrl: input.post.sourceUrl,
    sourceCreatedAt: input.post.sourcePublishedAt,
    discoveryMethod: input.post.discoveryMethod,
    discoveryRunId: input.runId,
    discoveryCandidateId: input.candidateId,
    payload: {
      discovery: {
        provider: input.post.provider,
        method: input.post.discoveryMethod,
        runId: input.runId,
        candidateId: input.candidateId,
        sourceUrl: input.post.sourceUrl,
        publicMetrics: input.post.publicMetrics,
        language: input.post.language,
        velocityStatus: "unknown",
      },
      sourcePostId: input.post.externalPostId,
      sourceUrl: input.post.sourceUrl,
      tweetUrl: input.post.sourceUrl,
    },
  })

  if (!result.ok) {
    await prisma.arieDiscoveryCandidate.update({
      where: { id: input.candidateId },
      data: {
        ingestStatus: "ERROR",
        lastIngestError: result.reason,
        errorMessage: result.reason,
        scoutStatus: "error",
        ingestLeaseUntil: null,
      },
    })
    return {
      ingested: false,
      inboundCreated: false,
      inboundDeduped: false,
      opportunityCreated: false,
      opportunityDeduped: false,
      scoutExcluded: false,
      opportunityEligible: false,
    }
  }

  // Distinguish Scout exclusion from score ineligibility using stored opportunity.
  const opp = await prisma.arieOpportunity.findUnique({
    where: { id: result.opportunityId },
    select: {
      originalStatus: true,
      ignoredReason: true,
      originalScoreBreakdown: true,
    },
  })
  const reasonCodes =
    (opp?.originalScoreBreakdown as { reasonCodes?: string[] } | null)?.reasonCodes ?? []
  const scoutExcluded =
    opp?.originalStatus === "IGNORED" &&
    reasonCodes.some((c) => c.startsWith("scout_") || c === "scout_excluded")
  const scoreIneligible = !result.eligible && !scoutExcluded && !result.deduped

  let scoutStatus = "eligible"
  if (result.deduped) scoutStatus = "duplicate"
  else if (scoutExcluded) scoutStatus = "scout_excluded"
  else if (scoreIneligible) scoutStatus = "score_ineligible"
  else if (!result.eligible) scoutStatus = "score_ineligible"

  const inbound = await prisma.arieInboundEvent.findUnique({
    where: {
      platform_externalId: { platform: "X", externalId: input.post.externalPostId },
    },
  })

  await prisma.arieDiscoveryCandidate.update({
    where: { id: input.candidateId },
    data: {
      ingestStatus: "INGESTED",
      dedupeState: "ingested",
      inboundEventId: inbound?.id ?? null,
      opportunityId: result.opportunityId,
      scoutStatus,
      originalScore: result.originalScore,
      errorMessage: scoutExcluded
        ? reasonCodes.find((c) => c.startsWith("scout_")) ?? "scout_excluded"
        : null,
      lastIngestError: null,
      ingestLeaseUntil: null,
    },
  })

  void classifyScoutStatus(result)

  return {
    ingested: true,
    inboundCreated: !result.inboundDeduped,
    inboundDeduped: Boolean(result.inboundDeduped),
    opportunityCreated: Boolean(result.opportunityCreated),
    opportunityDeduped: Boolean(result.deduped && !result.opportunityCreated),
    scoutExcluded,
    opportunityEligible: result.eligible && !result.deduped,
    opportunityId: result.opportunityId,
    originalScore: result.originalScore,
  }
}

export async function runDiscoveryEngine(opts?: {
  triggeredBy?: string
}): Promise<DiscoveryRunResult> {
  const empty = (status: DiscoveryRunStatus, reason?: string): DiscoveryRunResult => ({
    ok: status === "DISABLED" || status === "SUCCESS" || status === "NO_RESULTS" || status === "PARTIAL",
    runId: "",
    status,
    reason,
    candidatesFound: 0,
    candidatesDeduped: 0,
    candidatesRetried: 0,
    candidatesIngested: 0,
    scoutExcluded: 0,
    opportunityEligible: 0,
    opportunitiesCreated: 0,
    opportunityDeduped: 0,
    inboundCreated: 0,
    inboundDeduped: 0,
  })

  if (!arieDiscoveryEnabled()) {
    await arieLog("info", "discovery", "run_skipped_disabled", {})
    return empty("DISABLED", "discovery_disabled")
  }

  await seedDiscoverySourcesIfEmpty()

  const provider = getXDiscoveryProvider()
  // Observational only — no live X probe
  const health = observationalHealth()

  const run = await prisma.arieDiscoveryRun.create({
    data: {
      provider: "X",
      status: "RUNNING",
      triggeredBy: opts?.triggeredBy ?? "manual",
      capabilitySnapshot: health as unknown as Prisma.InputJsonValue,
    },
  })

  const counters: RunCounters = {
    candidatesFound: 0,
    candidatesDeduped: 0,
    candidatesRetried: 0,
    candidatesIngested: 0,
    scoutExcluded: 0,
    opportunityEligible: 0,
    opportunitiesCreated: 0,
    opportunityDeduped: 0,
    inboundCreated: 0,
    inboundDeduped: 0,
  }

  const errors: Array<{ code: string; sourceId?: string; rateLimited?: boolean }> = []
  let hadSuccess = false
  let rateLimitInfo: Record<string, unknown> | null = null

  const maxCandidates = arieDiscoveryMaxCandidatesPerRun()
  const maxSources = arieDiscoveryMaxSourcesPerRun()
  const lookbackMinutes = arieDiscoveryLookbackMinutes()

  const sources = await listEnabledDiscoverySources(maxSources)

  if (!health.bearerConfigured) {
    errors.push({ code: "missing_bearer" })
  }

  try {
    for (const source of sources) {
      if (counters.candidatesFound >= maxCandidates) break

      const remaining = maxCandidates - counters.candidatesFound
      const maxResults = Math.min(source.maxCandidatesPerPoll, remaining)

      let fetchResult:
        | Awaited<ReturnType<typeof provider.getPostsFromAccounts>>
        | Awaited<ReturnType<typeof provider.searchPosts>>

      if (source.sourceType === "account") {
        if (
          !shouldAttemptCapability("user_timeline") &&
          !shouldAttemptCapability("user_lookup")
        ) {
          errors.push({ code: "user_timeline_unavailable", sourceId: source.id })
          await markSourcePolled(source.id, { error: "user_timeline_unavailable" })
          continue
        }
        fetchResult = await provider.getPostsFromAccounts({
          handle: source.handle ?? "",
          authorId: source.authorId,
          maxResults,
          sinceId: source.lastSeenPostId,
          lookbackMinutes,
        })
      } else {
        if (!shouldAttemptCapability("recent_search")) {
          errors.push({ code: "recent_search_unavailable", sourceId: source.id })
          await markSourcePolled(source.id, { error: "recent_search_unavailable" })
          continue
        }
        fetchResult = await provider.searchPosts({
          query: source.query ?? "",
          maxResults,
          lookbackMinutes,
        })
      }

      if (!fetchResult.ok) {
        errors.push({
          code: fetchResult.reason,
          sourceId: source.id,
          rateLimited: fetchResult.rateLimited,
        })
        if (fetchResult.rateLimited) {
          rateLimitInfo = { sourceId: source.id, reason: fetchResult.reason }
        }
        await markSourcePolled(source.id, { error: fetchResult.reason })
        continue
      }

      hadSuccess = true
      const posts = fetchResult.posts
      if (posts.length > 0 && source.sourceType === "account") {
        const newest = posts[0]?.externalPostId
        await markSourcePolled(source.id, {
          lastSeenPostId: newest ?? source.lastSeenPostId,
          authorId: posts[0]?.authorId ?? source.authorId,
          error: null,
        })
      } else {
        await markSourcePolled(source.id, { error: null })
      }

      for (const post of posts) {
        if (counters.candidatesFound >= maxCandidates) break

        // Prefer configured source handle when account timeline
        if (!post.authorHandle && source.handle) {
          post.authorHandle = source.handle.replace(/^@/, "").toLowerCase()
          if (post.sourceUrl?.includes("/i/web/status/") && post.authorHandle) {
            post.sourceUrl = `https://x.com/${post.authorHandle}/status/${post.externalPostId}`
          }
        }

        counters.candidatesFound += 1
        const priority = computeDiscoveryPriority({
          post,
          sourcePriority: source.priority,
          topicTags: source.topicTags,
        })

        const upserted = await upsertCandidate({
          runId: run.id,
          sourceId: source.id,
          post,
          priority,
        })

        if (!upserted.isNew && !upserted.shouldIngest) {
          counters.candidatesDeduped += 1
          continue
        }

        if (upserted.retried) counters.candidatesRetried += 1

        const ing = await ingestCandidate({
          candidateId: upserted.candidateId,
          runId: run.id,
          post,
        })

        if (ing.ingested) {
          counters.candidatesIngested += 1
          if (ing.inboundCreated) counters.inboundCreated += 1
          if (ing.inboundDeduped) counters.inboundDeduped += 1
          if (ing.opportunityCreated) counters.opportunitiesCreated += 1
          if (ing.opportunityDeduped) counters.opportunityDeduped += 1
          if (ing.scoutExcluded) counters.scoutExcluded += 1
          if (ing.opportunityEligible) counters.opportunityEligible += 1
        }
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    errors.push({ code: `run_exception:${msg.slice(0, 120)}` })
    await arieLog("error", "discovery", "run_exception", { runId: run.id, error: msg })
  }

  const status = deriveRunStatus({
    errors,
    candidatesFound: counters.candidatesFound,
    hadSuccess,
  })

  // Final observational snapshot after real fetches
  const finalHealth = observationalHealth()

  await prisma.arieDiscoveryRun.update({
    where: { id: run.id },
    data: {
      status,
      completedAt: new Date(),
      candidatesFound: counters.candidatesFound,
      candidatesDeduped: counters.candidatesDeduped,
      candidatesIngested: counters.candidatesIngested,
      candidatesRetried: counters.candidatesRetried,
      scoutExcluded: counters.scoutExcluded,
      scoutIgnored: counters.scoutExcluded, // legacy alias
      opportunityEligible: counters.opportunityEligible,
      opportunitiesCreated: counters.opportunitiesCreated,
      opportunityDeduped: counters.opportunityDeduped,
      inboundCreated: counters.inboundCreated,
      inboundDeduped: counters.inboundDeduped,
      errors: errors.length ? (errors as Prisma.InputJsonValue) : undefined,
      rateLimitInfo: rateLimitInfo as Prisma.InputJsonValue,
      capabilitySnapshot: finalHealth as unknown as Prisma.InputJsonValue,
    },
  })

  await arieLog("info", "discovery", "run_complete", {
    runId: run.id,
    status,
    ...counters,
    errorCount: errors.length,
  })

  return {
    ok: status === "SUCCESS" || status === "PARTIAL" || status === "NO_RESULTS",
    runId: run.id,
    status,
    reason: errors[0]?.code,
    ...counters,
  }
}
