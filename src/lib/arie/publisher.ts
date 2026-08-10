import { prisma } from "@/lib/prisma"
import {
  arieAutoPublishDailyCap,
  arieAutoPublishEnabled,
  arieAutoPublishMinOpportunity,
  arieOriginalPublishEnabled,
  ariePublishEnabled,
  arieXWriteConfigured,
} from "@/lib/arie/config"
import { arieLog } from "@/lib/arie/log"
import { NO_REPLY_TEXT } from "@/lib/arie/preview-draft"
import { extractTweetId, postOriginalTweet, postReplyTweet } from "@/lib/arie/x"
import { hashOriginalContent } from "@/lib/arie/original-prediction"
import type { AriePublishMode } from "@prisma/client"

const SILENCE = new Set([NO_REPLY_TEXT, "[IGNORED BY OPPORTUNITY]"])

export type PublishResult =
  | {
      ok: true
      tweetId: string
      mode: AriePublishMode
      previewId: string
    }
  | { ok: false; reason: string; previewId?: string; xBody?: string }

function startOfUtcDay(d = new Date()): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

export async function countPublishedToday(): Promise<number> {
  return prisma.arieSocialPost.count({
    where: {
      status: "PUBLISHED",
      createdAt: { gte: startOfUtcDay() },
    },
  })
}

export function isPublishableDraftText(text: string): boolean {
  const t = text.trim()
  if (!t || SILENCE.has(t)) return false
  if (t.length > 280) return false
  return true
}

/** Narrow auto lane: real tweet id + high opportunity + grounded non-silence draft. */
export function isAutoPublishEligible(input: {
  draftText: string
  opportunityScore: number
  inReplyToTweetId?: string | null
  confidence?: number | null
}): { ok: true } | { ok: false; reason: string } {
  if (!ariePublishEnabled()) return { ok: false, reason: "publish_disabled" }
  if (!arieAutoPublishEnabled()) return { ok: false, reason: "auto_publish_disabled" }
  if (!arieXWriteConfigured()) return { ok: false, reason: "missing_write_credentials" }
  if (!isPublishableDraftText(input.draftText)) return { ok: false, reason: "not_publishable_draft" }
  const replyTo = input.inReplyToTweetId ? extractTweetId(input.inReplyToTweetId) : null
  if (!replyTo) return { ok: false, reason: "missing_tweet_id" }
  if (input.opportunityScore < arieAutoPublishMinOpportunity()) {
    return { ok: false, reason: "opportunity_below_auto_min" }
  }
  if (input.confidence != null && input.confidence < 50) {
    return { ok: false, reason: "confidence_too_low" }
  }
  return { ok: true }
}

/**
 * Single choke point for live replies. Always checks ARIE_PUBLISH_ENABLED.
 */
export async function publishPreviewReply(input: {
  previewId: string
  mode: AriePublishMode
  /** Override / supply source tweet id (manual path). */
  inReplyToTweetId?: string | null
  /** Optional edited reply text (manual path). */
  textOverride?: string | null
}): Promise<PublishResult> {
  if (!ariePublishEnabled()) {
    await arieLog("warn", "publisher", "blocked_kill_switch", { previewId: input.previewId })
    return { ok: false, reason: "publish_disabled", previewId: input.previewId }
  }
  if (!arieXWriteConfigured()) {
    return { ok: false, reason: "missing_write_credentials", previewId: input.previewId }
  }

  const preview = await prisma.ariePreviewEval.findUnique({ where: { id: input.previewId } })
  if (!preview) return { ok: false, reason: "preview_not_found", previewId: input.previewId }

  if (preview.publishStatus === "PUBLISHED" && preview.publishedTweetId) {
    return {
      ok: true,
      tweetId: preview.publishedTweetId,
      mode: preview.publishMode ?? input.mode,
      previewId: preview.id,
    }
  }

  const text = (input.textOverride?.trim() || preview.draftText).trim()
  if (!isPublishableDraftText(text)) {
    return { ok: false, reason: "not_publishable_draft", previewId: preview.id }
  }

  const replyToRaw = input.inReplyToTweetId ?? preview.inReplyToTweetId
  const replyTo = replyToRaw ? extractTweetId(replyToRaw) : null
  if (!replyTo) {
    return { ok: false, reason: "missing_tweet_id", previewId: preview.id }
  }

  if (input.mode === "AUTO") {
    const gate = isAutoPublishEligible({
      draftText: text,
      opportunityScore: preview.opportunityScore,
      inReplyToTweetId: replyTo,
      confidence: preview.confidence,
    })
    if (!gate.ok) return { ok: false, reason: gate.reason, previewId: preview.id }

    const publishedToday = await countPublishedToday()
    if (publishedToday >= arieAutoPublishDailyCap()) {
      await arieLog("warn", "publisher", "daily_cap_reached", { publishedToday })
      return { ok: false, reason: "daily_cap_reached", previewId: preview.id }
    }
  }

  const posted = await postReplyTweet({ text, inReplyToTweetId: replyTo })
  if (!posted.ok) {
    await prisma.ariePreviewEval.update({
      where: { id: preview.id },
      data: {
        publishStatus: "FAILED",
        publishMode: input.mode,
        publishError: posted.reason,
        inReplyToTweetId: replyTo,
      },
    })
    await prisma.arieSocialPost.create({
      data: {
        previewEvalId: preview.id,
        inReplyToTweetId: replyTo,
        text,
        mode: input.mode,
        status: "FAILED",
        errorMessage: posted.reason,
      },
    })
    return {
      ok: false,
      reason: posted.reason,
      previewId: preview.id,
      xBody: posted.xBody,
    }
  }

  await prisma.ariePreviewEval.update({
    where: { id: preview.id },
    data: {
      publishStatus: "PUBLISHED",
      publishMode: input.mode,
      publishedTweetId: posted.tweetId,
      publishedAt: new Date(),
      publishError: null,
      inReplyToTweetId: replyTo,
    },
  })
  await prisma.arieSocialPost.create({
    data: {
      previewEvalId: preview.id,
      externalPostId: posted.tweetId,
      inReplyToTweetId: replyTo,
      text,
      mode: input.mode,
      status: "PUBLISHED",
    },
  })

  await arieLog("info", "publisher", "published", {
    previewId: preview.id,
    tweetId: posted.tweetId,
    mode: input.mode,
    replyTo,
  })

  return {
    ok: true,
    tweetId: posted.tweetId,
    mode: input.mode,
    previewId: preview.id,
  }
}

export type OriginalPublishResult =
  | {
      ok: true
      tweetId: string
      mode: AriePublishMode
      opportunityId: string
      idempotent?: boolean
    }
  | { ok: false; reason: string; opportunityId?: string; xBody?: string }

const PUBLISH_LOCK_MS = 120_000

/**
 * Human-approved original post via the single Publisher choke point.
 * Requires ARIE_PUBLISH_ENABLED + ARIE_ORIGINAL_PUBLISH_ENABLED.
 * AUTO mode is intentionally unsupported. Double-click / retry safe.
 */
export async function publishOriginalOpportunity(input: {
  opportunityId: string
  mode?: AriePublishMode
  textOverride?: string | null
}): Promise<OriginalPublishResult> {
  const mode: AriePublishMode = input.mode ?? "MANUAL"
  if (mode === "AUTO") {
    await arieLog("warn", "publisher", "original_auto_blocked", {
      opportunityId: input.opportunityId,
    })
    return { ok: false, reason: "original_auto_disabled", opportunityId: input.opportunityId }
  }

  if (!ariePublishEnabled()) {
    await arieLog("warn", "publisher", "original_blocked_kill_switch", {
      opportunityId: input.opportunityId,
    })
    return { ok: false, reason: "publish_disabled", opportunityId: input.opportunityId }
  }
  if (!arieOriginalPublishEnabled()) {
    return {
      ok: false,
      reason: "original_publish_disabled",
      opportunityId: input.opportunityId,
    }
  }
  if (!arieXWriteConfigured()) {
    return {
      ok: false,
      reason: "missing_write_credentials",
      opportunityId: input.opportunityId,
    }
  }

  // Durable idempotency: claim PUBLISHING lock in a conditional update
  const attemptId = `pub_${input.opportunityId}_${Date.now()}`
  const lockUntil = new Date(Date.now() + PUBLISH_LOCK_MS)

  const claimed = await prisma.arieOpportunity.updateMany({
    where: {
      id: input.opportunityId,
      contentType: "original",
      originalStatus: "APPROVED",
      publishStatus: { not: "PUBLISHED" },
      OR: [{ publishLockUntil: null }, { publishLockUntil: { lt: new Date() } }],
    },
    data: {
      originalStatus: "PUBLISHING",
      publishLockUntil: lockUntil,
      publishAttemptId: attemptId,
    },
  })

  if (claimed.count === 0) {
    const existing = await prisma.arieOpportunity.findUnique({
      where: { id: input.opportunityId },
    })
    if (!existing || existing.contentType !== "original") {
      return { ok: false, reason: "not_original", opportunityId: input.opportunityId }
    }
    if (existing.publishStatus === "PUBLISHED" && existing.publishedTweetId) {
      return {
        ok: true,
        tweetId: existing.publishedTweetId,
        mode: existing.publishMode ?? mode,
        opportunityId: existing.id,
        idempotent: true,
      }
    }
    if (existing.originalStatus === "PUBLISHING") {
      await arieLog("warn", "publisher", "original_publish_in_progress", {
        opportunityId: existing.id,
      })
      return { ok: false, reason: "publish_in_progress", opportunityId: existing.id }
    }
    if (existing.originalStatus === "EXPIRED") {
      return { ok: false, reason: "expired", opportunityId: existing.id }
    }
    if (existing.originalStatus === "IGNORED" || existing.originalStatus === "REJECTED") {
      return { ok: false, reason: "not_publishable_status", opportunityId: existing.id }
    }
    return { ok: false, reason: "not_approved", opportunityId: existing.id }
  }

  const opp = await prisma.arieOpportunity.findUnique({ where: { id: input.opportunityId } })
  if (!opp) {
    return { ok: false, reason: "not_original", opportunityId: input.opportunityId }
  }

  if (opp.expiresAt && opp.expiresAt.getTime() < Date.now()) {
    await prisma.arieOpportunity.update({
      where: { id: opp.id },
      data: {
        originalStatus: "EXPIRED",
        publishLockUntil: null,
      },
    })
    return { ok: false, reason: "expired", opportunityId: opp.id }
  }

  const qa = opp.qaResult as { passed?: boolean } | null
  if (!qa?.passed) {
    await releasePublishLock(opp.id, "APPROVED", "qa_not_passed")
    return { ok: false, reason: "qa_not_passed", opportunityId: opp.id }
  }

  const text = (input.textOverride?.trim() || opp.finalDraft || "").trim()
  if (!isPublishableDraftText(text) || /\[NO REPLY\]/i.test(text)) {
    await releasePublishLock(opp.id, "APPROVED", "not_publishable_draft")
    return { ok: false, reason: "not_publishable_draft", opportunityId: opp.id }
  }

  // Prior published social post for this opportunity
  const prior = await prisma.arieSocialPost.findFirst({
    where: { opportunityId: opp.id, status: "PUBLISHED" },
  })
  if (prior?.externalPostId) {
    await prisma.arieOpportunity.update({
      where: { id: opp.id },
      data: {
        publishStatus: "PUBLISHED",
        originalStatus: "PUBLISHED",
        publishedTweetId: prior.externalPostId,
        publishedAt: prior.createdAt,
        publishedText: prior.text,
        publishLockUntil: null,
        predictionLockedAt: opp.predictionLockedAt ?? new Date(),
      },
    })
    return {
      ok: true,
      tweetId: prior.externalPostId,
      mode: prior.mode,
      opportunityId: opp.id,
      idempotent: true,
    }
  }

  // Same text already published under any original
  const contentHash = opp.contentHash || hashOriginalContent(text)
  const sameText = await prisma.arieOpportunity.findFirst({
    where: {
      contentType: "original",
      contentHash,
      id: { not: opp.id },
      publishStatus: "PUBLISHED",
      publishedTweetId: { not: null },
    },
  })
  if (sameText?.publishedTweetId) {
    await releasePublishLock(opp.id, "APPROVED", "duplicate_content_hash")
    return { ok: false, reason: "duplicate_content_hash", opportunityId: opp.id }
  }

  await arieLog("info", "publisher", "original_publish_attempted", {
    opportunityId: opp.id,
    attemptId,
  })

  const posted = await postOriginalTweet({ text })
  if (!posted.ok) {
    await prisma.arieOpportunity.update({
      where: { id: opp.id },
      data: {
        publishStatus: "FAILED",
        publishMode: mode,
        publishError: posted.reason,
        originalStatus: "APPROVED",
        publishLockUntil: null,
      },
    })
    await prisma.arieSocialPost.create({
      data: {
        opportunityId: opp.id,
        text,
        mode,
        status: "FAILED",
        errorMessage: posted.reason,
        contentFormat: opp.contentFormat,
        attributionCode: opp.attributionCode,
        predictedScore: opp.predictedScore,
        predictionVersion: opp.predictionVersion,
      },
    })
    await arieLog("error", "publisher", "original_publish_failed", {
      opportunityId: opp.id,
      reason: posted.reason,
    })
    return {
      ok: false,
      reason: posted.reason,
      opportunityId: opp.id,
      xBody: posted.xBody,
    }
  }

  const now = new Date()
  await prisma.arieOpportunity.update({
    where: { id: opp.id },
    data: {
      publishStatus: "PUBLISHED",
      publishMode: mode,
      publishedTweetId: posted.tweetId,
      publishedAt: now,
      publishError: null,
      originalStatus: "PUBLISHED",
      finalDraft: text,
      publishedText: text,
      contentHash,
      publishLockUntil: null,
      predictionLockedAt: opp.predictionLockedAt ?? now,
    },
  })
  await prisma.arieSocialPost.create({
    data: {
      opportunityId: opp.id,
      externalPostId: posted.tweetId,
      text,
      mode,
      status: "PUBLISHED",
      contentFormat: opp.contentFormat,
      attributionCode: opp.attributionCode,
      predictedScore: opp.predictedScore,
      predictionVersion: opp.predictionVersion,
      actorRatingClicks: 0,
      actorRatingSessions: 0,
      ratingsCreated: 0,
      waitlistSignups: 0,
    },
  })

  await arieLog("info", "publisher", "original_published", {
    opportunityId: opp.id,
    tweetId: posted.tweetId,
    mode,
  })

  return {
    ok: true,
    tweetId: posted.tweetId,
    mode,
    opportunityId: opp.id,
  }
}

async function releasePublishLock(
  opportunityId: string,
  status: string,
  reason: string,
): Promise<void> {
  await prisma.arieOpportunity.update({
    where: { id: opportunityId },
    data: {
      originalStatus: status,
      publishLockUntil: null,
      publishError: reason,
    },
  })
}

/** Best-effort auto publish after draft generation. Never throws. */
export async function maybeAutoPublishPreview(previewId: string): Promise<PublishResult | null> {
  try {
    const preview = await prisma.ariePreviewEval.findUnique({ where: { id: previewId } })
    if (!preview) return null
    const gate = isAutoPublishEligible({
      draftText: preview.draftText,
      opportunityScore: preview.opportunityScore,
      inReplyToTweetId: preview.inReplyToTweetId,
      confidence: preview.confidence,
    })
    if (!gate.ok) {
      await arieLog("info", "publisher", "auto_skipped", {
        previewId,
        reason: gate.reason,
      })
      return { ok: false, reason: gate.reason, previewId }
    }
    return await publishPreviewReply({ previewId, mode: "AUTO" })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    await arieLog("error", "publisher", "auto_exception", { previewId, error: message })
    return { ok: false, reason: message, previewId }
  }
}
