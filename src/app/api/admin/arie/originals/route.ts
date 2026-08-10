export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import {
  expireStaleOriginals,
  ingestOriginalOpportunity,
} from "@/lib/arie/original-pipeline"

function serializeOpp(row: {
  id: string
  contentType: string
  originalStatus: string | null
  originalScore: number | null
  originalScoreBreakdown: unknown
  opportunityScore: number | null
  priorityAuthor: boolean
  dedupeKey: string | null
  expiresAt: Date | null
  concepts: unknown
  selectedConceptId: string | null
  selectedConcept: unknown
  conceptRankMeta: unknown
  visualSpec: unknown
  finalDraft: string | null
  draftJson: unknown
  qaResult: unknown
  publishStatus: string
  publishedTweetId: string | null
  publishedAt: Date | null
  publishError: string | null
  approvedAt: Date | null
  approvedByEmail: string | null
  ignoredReason: string | null
  promptVersions: unknown
  modelMeta: unknown
  conceptGenCount: number
  draftGenCount: number
  qaRunCount: number
  contentFormat: string | null
  sourceHandle: string | null
  sourcePostId: string | null
  sourceType: string | null
  sourceUrl: string | null
  sourceTimestamp: Date | null
  prediction: unknown
  predictionVersion: string | null
  predictionLockedAt: Date | null
  predictedScore: number | null
  predictedTier: string | null
  publishedText: string | null
  contentHash: string | null
  attributionCode: string | null
  lineage: unknown
  createdAt: Date
  updatedAt: Date
  inboundEvent?: {
    id: string
    text: string
    authorHandle: string | null
    externalId: string
    receivedAt: Date
  } | null
  contextPackage?: { id: string; builderVersion: string; package: unknown } | null
  socialPosts?: Array<{
    id: string
    externalPostId: string | null
    status: string
    impressions: number | null
    likes: number | null
    replies: number | null
    reposts: number | null
    quotes: number | null
    bookmarks: number | null
    profileVisits: number | null
    followerDelta: number | null
    linkClicks: number | null
    engagementRate: number | null
    actorRatingClicks: number | null
    actorRatingSessions: number | null
    ratingsCreated: number | null
    waitlistSignups: number | null
    metricsUpdatedAt: Date | null
  }>
}) {
  const pkg = row.contextPackage?.package as { coverage?: unknown } | null
  const publishedPost =
    row.socialPosts?.find((p) => p.status === "PUBLISHED") ?? row.socialPosts?.[0] ?? null
  return {
    id: row.id,
    contentType: row.contentType,
    originalStatus: row.originalStatus,
    originalScore: row.originalScore,
    originalScoreBreakdown: row.originalScoreBreakdown,
    replyOpportunityScore: row.opportunityScore,
    priorityAuthor: row.priorityAuthor,
    dedupeKey: row.dedupeKey,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    concepts: row.concepts,
    selectedConceptId: row.selectedConceptId,
    selectedConcept: row.selectedConcept,
    conceptRankMeta: row.conceptRankMeta,
    visualSpec: row.visualSpec,
    finalDraft: row.finalDraft,
    draftJson: row.draftJson,
    qaResult: row.qaResult,
    publishStatus: row.publishStatus,
    publishedTweetId: row.publishedTweetId,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    publishError: row.publishError,
    approvedAt: row.approvedAt?.toISOString() ?? null,
    approvedByEmail: row.approvedByEmail,
    ignoredReason: row.ignoredReason,
    promptVersions: row.promptVersions,
    modelMeta: row.modelMeta,
    conceptGenCount: row.conceptGenCount,
    draftGenCount: row.draftGenCount,
    qaRunCount: row.qaRunCount,
    contentFormat: row.contentFormat,
    sourceHandle: row.sourceHandle,
    sourcePostId: row.sourcePostId,
    sourceType: row.sourceType,
    sourceUrl: row.sourceUrl,
    sourceTimestamp: row.sourceTimestamp?.toISOString() ?? null,
    prediction: row.prediction,
    predictionVersion: row.predictionVersion,
    predictionLockedAt: row.predictionLockedAt?.toISOString() ?? null,
    predictedScore: row.predictedScore,
    predictedTier: row.predictedTier,
    publishedText: row.publishedText,
    contentHash: row.contentHash,
    attributionCode: row.attributionCode,
    lineage: row.lineage,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    coverage: pkg?.coverage ?? null,
    event: row.inboundEvent
      ? {
          id: row.inboundEvent.id,
          text: row.inboundEvent.text,
          authorHandle: row.inboundEvent.authorHandle,
          externalId: row.inboundEvent.externalId,
          receivedAt: row.inboundEvent.receivedAt.toISOString(),
        }
      : null,
    contextPackageId: row.contextPackage?.id ?? null,
    builderVersion: row.contextPackage?.builderVersion ?? null,
    socialPost: publishedPost
      ? {
          id: publishedPost.id,
          externalPostId: publishedPost.externalPostId,
          status: publishedPost.status,
          impressions: publishedPost.impressions,
          likes: publishedPost.likes,
          replies: publishedPost.replies,
          reposts: publishedPost.reposts,
          quotes: publishedPost.quotes,
          bookmarks: publishedPost.bookmarks,
          profileVisits: publishedPost.profileVisits,
          followerDelta: publishedPost.followerDelta,
          linkClicks: publishedPost.linkClicks,
          engagementRate: publishedPost.engagementRate,
          actorRatingClicks: publishedPost.actorRatingClicks,
          actorRatingSessions: publishedPost.actorRatingSessions,
          ratingsCreated: publishedPost.ratingsCreated,
          waitlistSignups: publishedPost.waitlistSignups,
          metricsUpdatedAt: publishedPost.metricsUpdatedAt?.toISOString() ?? null,
        }
      : null,
  }
}

/** GET — list original opportunities (filters via ?status=). */
export async function GET(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  await expireStaleOriginals()

  const status = request.nextUrl.searchParams.get("status")
  const id = request.nextUrl.searchParams.get("id")
  const limit = Math.min(50, Number(request.nextUrl.searchParams.get("limit") ?? "30") || 30)

  if (id) {
    const row = await prisma.arieOpportunity.findFirst({
      where: { id, contentType: "original" },
      include: {
        inboundEvent: true,
        contextPackage: true,
        socialPosts: {
          where: { status: "PUBLISHED" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({ opportunity: serializeOpp(row) })
  }

  const where: {
    contentType: "original"
    originalStatus?: string | { in: string[] }
    originalScore?: { gte: number }
  } = { contentType: "original" }

  if (status === "high") {
    where.originalScore = { gte: 75 }
    where.originalStatus = { in: ["ELIGIBLE", "CONCEPTS_GENERATED", "CONCEPT_SELECTED", "DRAFT_GENERATED", "READY", "QA_FAILED"] }
  } else if (status === "concepts") {
    where.originalStatus = "CONCEPTS_GENERATED"
  } else if (status === "draft") {
    where.originalStatus = { in: ["DRAFT_GENERATED", "QA_FAILED"] }
  } else if (status === "ready") {
    where.originalStatus = { in: ["READY", "APPROVED"] }
  } else if (status === "published") {
    where.originalStatus = "PUBLISHED"
  } else if (status === "ignored") {
    where.originalStatus = { in: ["IGNORED", "REJECTED", "DUPLICATE"] }
  } else if (status === "expired") {
    where.originalStatus = "EXPIRED"
  } else if (status === "new" || status === "eligible") {
    where.originalStatus = "ELIGIBLE"
  } else if (status && status !== "all") {
    where.originalStatus = status.toUpperCase()
  }

  const rows = await prisma.arieOpportunity.findMany({
    where,
    include: {
      inboundEvent: true,
      contextPackage: true,
      socialPosts: {
        where: { status: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ originalScore: "desc" }, { createdAt: "desc" }],
    take: limit,
  })

  const counts = await prisma.arieOpportunity.groupBy({
    by: ["originalStatus"],
    where: { contentType: "original" },
    _count: { _all: true },
  })

  return NextResponse.json({
    opportunities: rows.map(serializeOpp),
    counts: Object.fromEntries(
      counts.map((c) => [c.originalStatus ?? "null", c._count._all]),
    ),
    total: await prisma.arieOpportunity.count({ where: { contentType: "original" } }),
  })
}

/** POST — ingest a new original opportunity from event text. */
export async function POST(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => null)) as null | {
    text?: string
    authorHandle?: string
    externalId?: string
    heatHint?: number
  }
  if (!body?.text?.trim()) {
    return NextResponse.json({ error: "text required" }, { status: 400 })
  }

  const result = await ingestOriginalOpportunity({
    text: body.text,
    authorHandle: body.authorHandle ?? null,
    externalId: body.externalId ?? null,
    heatHint: body.heatHint ?? null,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 422 })
  }

  const row = await prisma.arieOpportunity.findUnique({
    where: { id: result.opportunityId },
    include: {
      inboundEvent: true,
      contextPackage: true,
      socialPosts: { take: 1 },
    },
  })

  return NextResponse.json({
    ...result,
    opportunity: row ? serializeOpp(row) : null,
  })
}
