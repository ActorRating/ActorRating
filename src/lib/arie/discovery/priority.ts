/**
 * Cheap deterministic discovery priority — separate from Original Opportunity Score.
 * No Groq. No factual truth claims.
 */

import type { PublicMetrics, RawDiscoveryPost } from "@/lib/arie/discovery/types"
import { distributionRank, isPriorityAuthor } from "@/lib/arie/priority-accounts"

export type DiscoveryPriorityInput = {
  post: RawDiscoveryPost
  sourcePriority: number
  topicTags?: string[]
  matchedKeywords?: string[]
}

function engagementScore(metrics: PublicMetrics | null | undefined): number {
  if (!metrics) return 0
  const likes = metrics.likeCount ?? 0
  const replies = metrics.replyCount ?? 0
  const reposts = metrics.retweetCount ?? 0
  const quotes = metrics.quoteCount ?? 0
  const raw = likes + replies * 2 + reposts * 2 + quotes * 2
  if (raw <= 0) return 0
  // Log scale — cheap, deterministic
  return Math.min(25, Math.round(Math.log10(raw + 1) * 10))
}

function recencyScore(publishedAt: Date | null, now = new Date()): number {
  if (!publishedAt) return 0
  const ageMin = Math.max(0, (now.getTime() - publishedAt.getTime()) / 60_000)
  if (ageMin <= 15) return 20
  if (ageMin <= 60) return 15
  if (ageMin <= 180) return 10
  if (ageMin <= 360) return 5
  return 0
}

function keywordRelevanceScore(text: string, topicTags: string[], matched: string[]): number {
  if (!topicTags.length && !matched.length) return 0
  const lower = text.toLowerCase()
  let hits = 0
  for (const tag of [...topicTags, ...matched]) {
    const t = tag.trim().toLowerCase()
    if (t && lower.includes(t)) hits += 1
  }
  return Math.min(15, hits * 3)
}

export function computeDiscoveryPriority(input: DiscoveryPriorityInput, now = new Date()): number {
  const { post, sourcePriority, topicTags = [], matchedKeywords = [] } = input

  let score = Math.min(30, Math.max(0, Math.round(sourcePriority / 3)))

  if (post.authorHandle && isPriorityAuthor(post.authorHandle)) {
    score += 8 + distributionRank(post.authorHandle)
  }

  score += recencyScore(post.sourcePublishedAt, now)
  score += engagementScore(post.publicMetrics)
  score += keywordRelevanceScore(post.text, topicTags, matchedKeywords)

  return Math.min(100, Math.max(0, score))
}

/** Velocity requires historical metric snapshots — never fabricate. */
export function velocityStatusFromHistory(hasHistory: boolean): "unknown" | "stale" | "active" | "accelerating" {
  if (!hasHistory) return "unknown"
  return "unknown"
}
