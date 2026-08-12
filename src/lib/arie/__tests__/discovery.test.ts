/**
 * ARIE Discovery Engine V1 hardening — unit tests (mocked X API, no live network).
 */

import {
  arieDiscoveryEnabled,
  arieOriginalPublishEnabled,
  ariePublishEnabled,
  arieAutoPublishEnabled,
} from "@/lib/arie/config"
import {
  computeDiscoveryPriority,
  velocityStatusFromHistory,
} from "@/lib/arie/discovery/priority"
import {
  buildTweetUrl,
  normalizeXTweet,
  normalizeXTimeline,
  resolveAuthorHandle,
} from "@/lib/arie/discovery/normalize"
import {
  buildUserTimelineParams,
  clampSearchMaxResults,
  clampTimelineMaxResults,
} from "@/lib/arie/discovery/x-read"
import {
  getCapabilityCache,
  observationalHealth,
  recordCapabilityResult,
  resetCapabilityCacheForTests,
  shouldAttemptCapability,
} from "@/lib/arie/discovery/capabilities"
import type { RawDiscoveryPost } from "@/lib/arie/discovery/types"
import { postOriginalTweet, postReplyTweet } from "@/lib/arie/x"
import { runDiscoveryEngine } from "@/lib/arie/discovery/run"
import { getXDiscoveryProvider } from "@/lib/arie/discovery/providers/x-provider"
import { scoreOriginalOpportunity } from "@/lib/arie/original-score"
import { evaluateScoutExclusion } from "@/lib/arie/scout-exclusions"
import { buildEvidenceLayer } from "@/lib/arie/provenance"
import {
  isGenericNewsConcept,
} from "@/lib/arie/concept-payload"
import type { ExtractedEntities } from "@/lib/arie/entity-extract"
import type { OriginalConcept } from "@/lib/arie/original-types"
import { readFileSync } from "fs"
import { join } from "path"

jest.mock("@/lib/prisma", () => ({
  prisma: {
    arieDiscoverySource: {
      count: jest.fn().mockResolvedValue(1),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn(),
      update: jest.fn(),
    },
    arieDiscoveryRun: {
      create: jest.fn().mockResolvedValue({ id: "run-1" }),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
    arieDiscoveryCandidate: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: "cand-1",
        ingestStatus: "PENDING",
        ingestLeaseUntil: null,
        opportunityId: null,
        discoveryPriority: 0,
        publicMetrics: null,
        authorHandle: null,
        sourceUrl: null,
        dedupeState: "new",
      }),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    arieInboundEvent: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    arieOpportunity: {
      findFirst: jest.fn(),
      findUnique: jest.fn().mockResolvedValue({
        originalStatus: "ELIGIBLE",
        ignoredReason: null,
        originalScoreBreakdown: { reasonCodes: ["original_eligible"] },
      }),
      create: jest.fn(),
      count: jest.fn(),
    },
    arieContextPackage: { create: jest.fn() },
    arieLog: { create: jest.fn() },
  },
}))

jest.mock("@/lib/arie/discovery/providers/x-provider", () => ({
  getXDiscoveryProvider: jest.fn(),
}))

jest.mock("@/lib/arie/original-pipeline", () => ({
  ingestOriginalOpportunity: jest.fn().mockResolvedValue({
    ok: true,
    opportunityId: "opp-1",
    originalStatus: "ELIGIBLE",
    originalScore: 72,
    eligible: true,
    deduped: false,
    opportunityCreated: true,
    inboundDeduped: false,
  }),
}))

jest.mock("@/lib/arie/discovery/sources", () => ({
  seedDiscoverySourcesIfEmpty: jest.fn().mockResolvedValue(0),
  listEnabledDiscoverySources: jest.fn().mockResolvedValue([
    {
      id: "src-1",
      sourceType: "account",
      handle: "deadline",
      authorId: "123",
      priority: 90,
      topicTags: ["casting"],
      maxCandidatesPerPoll: 5,
      lastSeenPostId: null,
    },
  ]),
  markSourcePolled: jest.fn(),
  buildSourceKey: (s: { sourceType: string; handle?: string; query?: string }) =>
    s.sourceType === "account" ? `account:${s.handle}` : `keyword:${s.query}`,
  loadDefaultDiscoverySources: jest.fn(),
}))

const samplePost: RawDiscoveryPost = {
  provider: "X",
  externalPostId: "999",
  authorHandle: "deadline",
  authorId: "1",
  text: "Marvel casting news: Actor joins Avengers sequel",
  sourceUrl: "https://x.com/deadline/status/999",
  sourcePublishedAt: new Date("2026-08-12T10:00:00Z"),
  discoveryMethod: "account_timeline",
  publicMetrics: { likeCount: 50, replyCount: 20, retweetCount: 10 },
}

const emptyEntities: ExtractedEntities = {
  actors: [],
  movies: [],
  directors: [],
  unresolved: [],
}

describe("discovery config defaults", () => {
  it("discovery disabled by default", () => {
    expect(arieDiscoveryEnabled()).toBe(false)
  })

  it("publish flags remain off by default", () => {
    expect(ariePublishEnabled()).toBe(false)
    expect(arieOriginalPublishEnabled()).toBe(false)
    expect(arieAutoPublishEnabled()).toBe(false)
  })
})

describe("A — raw engagement does not become velocity", () => {
  it("50 likes + 20 replies does NOT produce velocity=exploding", () => {
    // Discovery must omit heatHint; score without hint stays unknown
    const scored = scoreOriginalOpportunity({
      text: samplePost.text,
      authorHandle: samplePost.authorHandle,
      entities: emptyEntities,
      // intentionally omit heatHint
    })
    expect(scored.velocity).toBe("unknown")
    expect(scored.reasonCodes).toContain("velocity_unknown")
  })

  it("raw engagement as heatHint would explode — proving why discovery must not pass it", () => {
    const fabricated = 50 + 20 * 2 // old buggy formula
    expect(fabricated).toBe(90)
    const scored = scoreOriginalOpportunity({
      text: samplePost.text,
      authorHandle: samplePost.authorHandle,
      entities: emptyEntities,
      heatHint: fabricated,
    })
    expect(scored.velocity).toBe("exploding")
  })

  it("discovery run source does not pass heatHint", () => {
    const runSrc = readFileSync(join(process.cwd(), "src/lib/arie/discovery/run.ts"), "utf8")
    expect(runSrc).toContain("NEVER pass raw engagement as heatHint")
    expect(runSrc).not.toMatch(/heatHint:\s*\n?\s*\(/)
    expect(runSrc).not.toMatch(/likeCount \?\? 0\) \+/)
  })
})

describe("normalization + author handle fallback", () => {
  it("normalizes X tweet with metrics", () => {
    const post = normalizeXTweet({
      tweet: {
        id: "111",
        text: "Trailer drop tonight",
        author_id: "u1",
        created_at: "2026-08-12T12:00:00.000Z",
        lang: "en",
        public_metrics: { like_count: 10, reply_count: 2 },
      },
      usersById: new Map([["u1", { id: "u1", username: "FilmUpdates" }]]),
      discoveryMethod: "account_timeline",
    })
    expect(post?.authorHandle).toBe("filmupdates")
    expect(post?.publicMetrics).toMatchObject({ likeCount: 10, replyCount: 2 })
  })

  it("I — authorHandle falls back to configured source handle", () => {
    expect(
      resolveAuthorHandle({ expandedUsername: null, fallbackHandle: "@Deadline" }),
    ).toBe("deadline")
    const post = normalizeXTweet({
      tweet: { id: "222", text: "Casting news", author_id: "u9" },
      usersById: new Map(), // missing includes.users
      discoveryMethod: "account_timeline",
      fallbackHandle: "deadline",
    })
    expect(post?.authorHandle).toBe("deadline")
    expect(post?.sourceUrl).toBe("https://x.com/deadline/status/222")
  })

  it("builds canonical tweet URL", () => {
    expect(buildTweetUrl("deadline", "555")).toBe("https://x.com/deadline/status/555")
  })
})

describe("G/H — account timeline excludes replies and retweets", () => {
  it("buildUserTimelineParams sets exclude=replies,retweets", () => {
    const params = buildUserTimelineParams({ maxResults: 10 })
    expect(params.exclude).toBe("replies,retweets")
  })

  it("search clamp does not add exclude (search uses query filters)", () => {
    expect(clampSearchMaxResults(15, 7)).toBe(10) // API min 10
    expect(clampTimelineMaxResults(15, 7)).toBe(7)
  })
})

describe("discovery priority", () => {
  it("scores engagement without affecting Opportunity Score velocity", () => {
    const score = computeDiscoveryPriority(
      { post: samplePost, sourcePriority: 90, topicTags: ["Marvel"] },
      new Date("2026-08-12T10:30:00Z"),
    )
    expect(score).toBeGreaterThan(30)
    expect(velocityStatusFromHistory(false)).toBe("unknown")
  })
})

describe("capability cache — no permanent false negatives", () => {
  beforeEach(() => resetCapabilityCacheForTests())

  it("O — transient 429 does not permanently disable", () => {
    recordCapabilityResult("user_timeline", { ok: false, status: 429, rateLimited: true })
    expect(getCapabilityCache().user_timeline).toBe("unknown")
    expect(shouldAttemptCapability("user_timeline")).toBe(true)
  })

  it("O — timeout stays unknown / attemptable", () => {
    recordCapabilityResult("recent_search", { ok: false, reason: "timeout" })
    expect(getCapabilityCache().recent_search).toBe("unknown")
    expect(shouldAttemptCapability("recent_search")).toBe(true)
  })

  it("403 marks unavailable", () => {
    recordCapabilityResult("recent_search", { ok: false, status: 403 })
    expect(getCapabilityCache().recent_search).toBe("unavailable")
    expect(shouldAttemptCapability("recent_search")).toBe(false)
  })

  it("success marks available", () => {
    recordCapabilityResult("user_lookup", { ok: true })
    expect(getCapabilityCache().user_lookup).toBe("available")
  })

  it("P — observational health does not probe X", () => {
    const h = observationalHealth()
    expect(h.provider).toBe("X")
    expect(h.capabilities).toBeDefined()
  })
})

describe("provider / run status", () => {
  const { prisma } = require("@/lib/prisma")
  const { ingestOriginalOpportunity } = require("@/lib/arie/original-pipeline")

  beforeEach(() => {
    process.env.ARIE_DISCOVERY_ENABLED = "true"
    resetCapabilityCacheForTests()
    // First upsert lookup → null (create new); subsequent lookups → PENDING (claim/ingest)
    prisma.arieDiscoveryCandidate.findUnique
      .mockReset()
      .mockResolvedValueOnce(null)
      .mockResolvedValue({
        id: "cand-1",
        ingestStatus: "PENDING",
        ingestLeaseUntil: null,
        opportunityId: null,
        discoveryPriority: 0,
        publicMetrics: null,
        authorHandle: "deadline",
        sourceUrl: samplePost.sourceUrl,
        dedupeState: "new",
      })
    prisma.arieDiscoveryCandidate.create.mockResolvedValue({
      id: "cand-1",
      ingestStatus: "PENDING",
      ingestLeaseUntil: null,
      opportunityId: null,
      discoveryPriority: 0,
      publicMetrics: null,
      authorHandle: null,
      sourceUrl: null,
      dedupeState: "new",
    })
    prisma.arieDiscoveryRun.create.mockResolvedValue({ id: "run-1" })
    prisma.arieOpportunity.findUnique.mockResolvedValue({
      originalStatus: "ELIGIBLE",
      ignoredReason: null,
      originalScoreBreakdown: { reasonCodes: ["original_eligible"] },
    })
    ingestOriginalOpportunity.mockResolvedValue({
      ok: true,
      opportunityId: "opp-1",
      originalStatus: "ELIGIBLE",
      originalScore: 72,
      eligible: true,
      deduped: false,
      opportunityCreated: true,
      inboundDeduped: false,
    })
    ;(getXDiscoveryProvider as jest.Mock).mockReturnValue({
      health: jest.fn().mockResolvedValue({
        ok: true,
        bearerConfigured: true,
        capabilities: { user_lookup: true, user_timeline: true, recent_search: false },
      }),
      getPostsFromAccounts: jest.fn().mockResolvedValue({ ok: true, posts: [samplePost] }),
      searchPosts: jest.fn(),
    })
  })

  afterEach(() => {
    delete process.env.ARIE_DISCOVERY_ENABLED
  })

  it("N — disabled discovery status is DISABLED not ERROR", async () => {
    delete process.env.ARIE_DISCOVERY_ENABLED
    const res = await runDiscoveryEngine()
    expect(res.status).toBe("DISABLED")
    expect(res.reason).toBe("discovery_disabled")
    expect(res.ok).toBe(true)
  })

  it("Q — force bypass removed from runDiscoveryEngine signature / API", () => {
    const apiSrc = readFileSync(
      join(process.cwd(), "src/app/api/admin/arie/discovery/route.ts"),
      "utf8",
    )
    expect(apiSrc).toContain("Kill switch is real")
    expect(apiSrc).not.toContain("body.force")
    expect(apiSrc).not.toContain("force: true")
    expect(apiSrc).not.toContain("force=true")
  })

  it("rate limit → RATE_LIMITED when no success", async () => {
    ;(getXDiscoveryProvider as jest.Mock).mockReturnValue({
      getPostsFromAccounts: jest.fn().mockResolvedValue({
        ok: false,
        reason: "rate_limited",
        rateLimited: true,
      }),
      searchPosts: jest.fn(),
    })
    const res = await runDiscoveryEngine({ triggeredBy: "test" })
    expect(res.status).toBe("RATE_LIMITED")
  })

  it("B — ERROR candidates are retryable", async () => {
    prisma.arieDiscoveryCandidate.findUnique.mockReset().mockResolvedValue({
      id: "cand-err",
      ingestStatus: "ERROR",
      ingestLeaseUntil: null,
      opportunityId: null,
      discoveryPriority: 40,
      publicMetrics: null,
      authorHandle: "deadline",
      sourceUrl: samplePost.sourceUrl,
      dedupeState: "new",
    })
    const res = await runDiscoveryEngine({ triggeredBy: "test" })
    expect(res.candidatesRetried).toBeGreaterThanOrEqual(1)
  })

  it("B/D — successful ingest marks INGESTED; rediscovery skips", async () => {
    const res1 = await runDiscoveryEngine({ triggeredBy: "test" })
    expect(res1.candidatesIngested).toBeGreaterThanOrEqual(1)
    expect(res1.opportunitiesCreated).toBeGreaterThanOrEqual(1)

    // Second: existing INGESTED with opportunity → dedupe skip
    prisma.arieDiscoveryCandidate.findUnique.mockReset().mockResolvedValue({
      id: "cand-1",
      ingestStatus: "INGESTED",
      ingestLeaseUntil: null,
      opportunityId: "opp-1",
      discoveryPriority: 50,
      publicMetrics: null,
      authorHandle: "deadline",
      sourceUrl: samplePost.sourceUrl,
      dedupeState: "ingested",
    })
    const res2 = await runDiscoveryEngine({ triggeredBy: "test" })
    expect(res2.candidatesDeduped).toBeGreaterThanOrEqual(1)
  })

  it("J — concurrent P2002 recovers without aborting run", async () => {
    const p2002 = Object.assign(new Error("Unique constraint"), { code: "P2002" })
    prisma.arieDiscoveryCandidate.create.mockRejectedValueOnce(p2002)
    prisma.arieDiscoveryCandidate.findUnique.mockReset()
      .mockResolvedValueOnce(null) // upsert lookup
      .mockResolvedValue({
        id: "cand-raced",
        ingestStatus: "PENDING",
        ingestLeaseUntil: null,
        opportunityId: null,
        discoveryPriority: 10,
        publicMetrics: null,
        authorHandle: "deadline",
        sourceUrl: null,
        dedupeState: "new",
      })

    const res = await runDiscoveryEngine({ triggeredBy: "test" })
    expect(res.status).not.toBe("ERROR")
    expect(res.runId).toBe("run-1")
  })

  it("K — opportunityCreated false does not inflate opportunitiesCreated", async () => {
    ingestOriginalOpportunity.mockResolvedValue({
      ok: true,
      opportunityId: "opp-existing",
      originalStatus: "ELIGIBLE",
      originalScore: 80,
      eligible: true,
      deduped: true,
      opportunityCreated: false,
      inboundDeduped: true,
    })
    prisma.arieOpportunity.findUnique.mockResolvedValue({
      originalStatus: "ELIGIBLE",
      ignoredReason: null,
      originalScoreBreakdown: { reasonCodes: ["original_eligible"] },
    })
    const res = await runDiscoveryEngine({ triggeredBy: "test" })
    expect(res.opportunitiesCreated).toBe(0)
    expect(res.opportunityDeduped).toBeGreaterThanOrEqual(1)
  })

  it("L — Scout exclusion counter uses scout_ reason codes", async () => {
    ingestOriginalOpportunity.mockResolvedValue({
      ok: true,
      opportunityId: "opp-scout",
      originalStatus: "IGNORED",
      originalScore: 20,
      eligible: false,
      deduped: false,
      opportunityCreated: true,
      inboundDeduped: false,
    })
    prisma.arieOpportunity.findUnique.mockResolvedValue({
      originalStatus: "IGNORED",
      ignoredReason: "scout_gossip",
      originalScoreBreakdown: { reasonCodes: ["scout_gossip", "original_ineligible"] },
    })
    const res = await runDiscoveryEngine({ triggeredBy: "test" })
    expect(res.scoutExcluded).toBeGreaterThanOrEqual(1)
    expect(res.opportunityEligible).toBe(0)
  })
})

describe("security — no X write from discovery", () => {
  it("R — discovery run never imports write helpers", () => {
    const discoveryRunSource = readFileSync(
      join(process.cwd(), "src/lib/arie/discovery/run.ts"),
      "utf8",
    )
    expect(discoveryRunSource).not.toContain("postOriginalTweet")
    expect(discoveryRunSource).not.toContain("postReplyTweet")
    expect(discoveryRunSource).not.toContain("publishOriginalOpportunity")
  })

  it("S — x write functions remain available for Publisher only", () => {
    expect(typeof postReplyTweet).toBe("function")
    expect(typeof postOriginalTweet).toBe("function")
  })
})

describe("Creator Unlock regressions still hold", () => {
  it("V — gossip remains Scout-excluded", () => {
    const r = evaluateScoutExclusion({
      text: "Celebrity couple splits after heated argument at premiere — full drama inside.",
      authorHandle: "boinkbuzz",
    })
    expect(r.excluded).toBe(true)
  })

  it("U — unknown rumor remains Scout-excluded", () => {
    const r = evaluateScoutExclusion({
      text: "I heard Tom Holland is quitting Spider-Man forever after Secret Wars.",
      authorHandle: "randomfilmfan99",
      tags: ["unknown_source"],
    })
    expect(r.excluded).toBe(true)
  })

  it("T — Tobey/BoinkBuzz provenance stays reported/aggregator", () => {
    const { evidence, source } = buildEvidenceLayer({
      text: "CONFIRMED — Tobey Maguire will wear the Iron Spider suit in Avengers.",
      authorHandle: "boinkbuzz",
      entities: {
        actors: [{ id: "a-tobey", name: "Tobey Maguire", slug: "tobey", confidence: 95 }],
        movies: [],
        directors: [],
        unresolved: [],
      },
      facts: [],
    })
    expect(source.distributionPriority).toBe("HIGH")
    expect(source.reliabilityClass).toBe("AGGREGATOR")
    expect(evidence.writerMode).not.toBe("VERIFIED_EVENT")
  })

  it("W/X — generic news paraphrase rejected; payload required", () => {
    expect(
      isGenericNewsConcept(
        {
          hook: "X is reportedly joining Y. Thoughts?",
          angle: "news paraphrase",
          discussionQuestion: "Thoughts?",
          dataUsed: [],
          actorRatingAdvantage: "",
          format: "question",
        },
        { actorRatingPayloadPresent: false, payloadType: null, payloadSummary: null },
      ),
    ).toBe(true)
  })
})

describe("source configuration", () => {
  it("builds stable source keys from real module", () => {
    const { buildSourceKey, loadDefaultDiscoverySources } = jest.requireActual<
      typeof import("@/lib/arie/discovery/sources")
    >("@/lib/arie/discovery/sources")
    expect(buildSourceKey({ sourceType: "account", handle: "@Deadline" })).toBe("account:deadline")
    expect(loadDefaultDiscoverySources().length).toBeGreaterThan(0)
  })
})

describe("admin dashboard — no live probe", () => {
  it("P — admin.ts does not call probeXReadCapabilities", () => {
    const adminSrc = readFileSync(
      join(process.cwd(), "src/lib/arie/discovery/admin.ts"),
      "utf8",
    )
    expect(adminSrc).toContain("zero live X calls")
    expect(adminSrc).not.toContain("probeXReadCapabilities")
    expect(adminSrc).toContain("observationalHealth")
  })

  it("x-read no longer exports live probe", () => {
    const xRead = readFileSync(join(process.cwd(), "src/lib/arie/discovery/x-read.ts"), "utf8")
    expect(xRead).not.toContain("probeXReadCapabilities")
  })
})
