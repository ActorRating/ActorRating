import { prisma } from "@/lib/prisma"
import { arieLog } from "@/lib/arie/log"

export const METRIC_WINDOWS = ["1h", "6h", "24h", "72h", "7d"] as const
export type MetricWindow = (typeof METRIC_WINDOWS)[number]

export type SocialMetricsInput = {
  impressions?: number | null
  likes?: number | null
  replies?: number | null
  reposts?: number | null
  quotes?: number | null
  bookmarks?: number | null
  profileVisits?: number | null
  followerDelta?: number | null
  linkClicks?: number | null
  engagementRate?: number | null
  actorRatingClicks?: number | null
  actorRatingSessions?: number | null
  ratingsCreated?: number | null
  waitlistSignups?: number | null
}

/** Upsert a windowed snapshot; does not invent null metrics as zero. */
export async function recordMetricSnapshot(input: {
  socialPostId: string
  window: MetricWindow
  metrics: SocialMetricsInput
}): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!METRIC_WINDOWS.includes(input.window)) {
    return { ok: false, reason: "invalid_window" }
  }
  const post = await prisma.arieSocialPost.findUnique({ where: { id: input.socialPostId } })
  if (!post) return { ok: false, reason: "social_post_not_found" }

  await prisma.arieMetricSnapshot.upsert({
    where: {
      socialPostId_window: {
        socialPostId: input.socialPostId,
        window: input.window,
      },
    },
    create: {
      socialPostId: input.socialPostId,
      window: input.window,
      ...nullableMetrics(input.metrics),
    },
    update: {
      capturedAt: new Date(),
      ...nullableMetrics(input.metrics),
    },
  })

  // Roll latest X+AR metrics onto the social post row (null-safe)
  await prisma.arieSocialPost.update({
    where: { id: input.socialPostId },
    data: {
      ...nullableMetrics(input.metrics),
      metricsUpdatedAt: new Date(),
    },
  })

  await arieLog("info", "metrics", "snapshot_recorded", {
    socialPostId: input.socialPostId,
    window: input.window,
  })
  return { ok: true }
}

function nullableMetrics(m: SocialMetricsInput) {
  return {
    impressions: m.impressions ?? undefined,
    likes: m.likes ?? undefined,
    replies: m.replies ?? undefined,
    reposts: m.reposts ?? undefined,
    quotes: m.quotes ?? undefined,
    bookmarks: m.bookmarks ?? undefined,
    profileVisits: m.profileVisits ?? undefined,
    followerDelta: m.followerDelta ?? undefined,
    linkClicks: m.linkClicks ?? undefined,
    engagementRate: m.engagementRate ?? undefined,
    actorRatingClicks: m.actorRatingClicks ?? undefined,
    actorRatingSessions: m.actorRatingSessions ?? undefined,
    ratingsCreated: m.ratingsCreated ?? undefined,
    waitlistSignups: m.waitlistSignups ?? undefined,
  }
}
