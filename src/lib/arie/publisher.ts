import { prisma } from "@/lib/prisma"
import {
  arieAutoPublishDailyCap,
  arieAutoPublishEnabled,
  arieAutoPublishMinOpportunity,
  ariePublishEnabled,
  arieXWriteConfigured,
} from "@/lib/arie/config"
import { arieLog } from "@/lib/arie/log"
import { NO_REPLY_TEXT } from "@/lib/arie/preview-draft"
import { extractTweetId, postReplyTweet } from "@/lib/arie/x"
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
