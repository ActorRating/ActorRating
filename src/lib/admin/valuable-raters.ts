/**
 * Valuable-rater definitions for admin traffic (no estimates).
 *
 * Guest identity = Rating.anonId when userId is null (approximate; cookies can reset).
 */

export const ENGAGED_RATER_WINDOW_MS = 7 * 24 * 60 * 60 * 1000
export const RETURNING_RATER_WINDOW_MS = 21 * 24 * 60 * 60 * 1000
export const ENGAGED_RATER_MIN_RATINGS = 3

export type RaterIdentity = {
  userId: string | null | undefined
  anonId: string | null | undefined
}

/** Stable key for a signed-in user or guest anon session. */
export function raterKey(identity: RaterIdentity): string | null {
  if (identity.userId && identity.userId.trim()) return `u:${identity.userId.trim()}`
  if (identity.anonId && identity.anonId.trim()) return `a:${identity.anonId.trim()}`
  return null
}

export type RatingStamp = { at: Date; utmSource?: string | null; utmCampaign?: string | null }

/**
 * Pure counting rules over an in-memory rating list (tests + docs).
 * `ratings` must be for a single rater, sorted optional.
 */
export function classifyRaterFromRatings(
  ratings: RatingStamp[],
  opts: { windowStart: Date; windowEnd: Date },
): {
  isNewInWindow: boolean
  isEngaged: boolean
  isReturning: boolean
  firstTouchSource: string
  firstTouchCampaign: string
} {
  if (ratings.length === 0) {
    return {
      isNewInWindow: false,
      isEngaged: false,
      isReturning: false,
      firstTouchSource: "(none)",
      firstTouchCampaign: "(none)",
    }
  }
  const sorted = [...ratings].sort((a, b) => a.at.getTime() - b.at.getTime())
  const first = sorted[0]!
  const firstMs = first.at.getTime()
  const inWindow = sorted.some(
    (r) => r.at.getTime() >= opts.windowStart.getTime() && r.at.getTime() <= opts.windowEnd.getTime(),
  )

  const within7 = sorted.filter(
    (r) => r.at.getTime() >= firstMs && r.at.getTime() <= firstMs + ENGAGED_RATER_WINDOW_MS,
  )
  const isEngaged =
    firstMs >= opts.windowStart.getTime() &&
    firstMs <= opts.windowEnd.getTime() &&
    within7.length >= ENGAGED_RATER_MIN_RATINGS

  const within21 = sorted.filter(
    (r) => r.at.getTime() >= firstMs && r.at.getTime() <= firstMs + RETURNING_RATER_WINDOW_MS,
  )
  const distinctDays = new Set(
    within21.map((r) => r.at.toISOString().slice(0, 10)),
  )
  const isReturning =
    firstMs >= opts.windowStart.getTime() &&
    firstMs <= opts.windowEnd.getTime() &&
    distinctDays.size >= 2

  const src = first.utmSource?.trim()
  const camp = first.utmCampaign?.trim()
  return {
    isNewInWindow: inWindow,
    isEngaged,
    isReturning,
    firstTouchSource: src && src.length > 0 ? src : "(none)",
    firstTouchCampaign: camp && camp.length > 0 ? camp : "(none)",
  }
}

export type ValuableRaterChannelRow = {
  key: string
  newRaters: number
  engagedRaters: number
  returningRaters: number
}

export type ValuableRaterMetrics = {
  newRaters: number
  engagedRaters: number
  returningRaters: number
  bySource: ValuableRaterChannelRow[]
  byCampaign: ValuableRaterChannelRow[]
  /** Shown in admin: guest keys use anonId and can reset. */
  guestIdentityNote: string
}

export const GUEST_IDENTITY_NOTE =
  "Guest raters are keyed by Rating.anonId (signed cookie). Identity is approximate if cookies clear or devices change."

export function emptyValuableRaterMetrics(): ValuableRaterMetrics {
  return {
    newRaters: 0,
    engagedRaters: 0,
    returningRaters: 0,
    bySource: [],
    byCampaign: [],
    guestIdentityNote: GUEST_IDENTITY_NOTE,
  }
}

/** Aggregate classifyRaterFromRatings results into totals + channel rows (unit-testable). */
export function aggregateValuableRaterClassifications(
  rows: Array<ReturnType<typeof classifyRaterFromRatings>>,
): Omit<ValuableRaterMetrics, "guestIdentityNote"> {
  let newRaters = 0
  let engagedRaters = 0
  let returningRaters = 0
  const bySource = new Map<string, ValuableRaterChannelRow>()
  const byCampaign = new Map<string, ValuableRaterChannelRow>()

  const bump = (
    map: Map<string, ValuableRaterChannelRow>,
    key: string,
    field: "newRaters" | "engagedRaters" | "returningRaters",
  ) => {
    let row = map.get(key)
    if (!row) {
      row = { key, newRaters: 0, engagedRaters: 0, returningRaters: 0 }
      map.set(key, row)
    }
    row[field] += 1
  }

  for (const r of rows) {
    if (r.isNewInWindow) {
      newRaters += 1
      bump(bySource, r.firstTouchSource, "newRaters")
      bump(byCampaign, r.firstTouchCampaign, "newRaters")
    }
    if (r.isEngaged) {
      engagedRaters += 1
      bump(bySource, r.firstTouchSource, "engagedRaters")
      bump(byCampaign, r.firstTouchCampaign, "engagedRaters")
    }
    if (r.isReturning) {
      returningRaters += 1
      bump(bySource, r.firstTouchSource, "returningRaters")
      bump(byCampaign, r.firstTouchCampaign, "returningRaters")
    }
  }

  const sortRows = (a: ValuableRaterChannelRow, b: ValuableRaterChannelRow) =>
    b.newRaters - a.newRaters ||
    b.engagedRaters - a.engagedRaters ||
    b.returningRaters - a.returningRaters

  return {
    newRaters,
    engagedRaters,
    returningRaters,
    bySource: [...bySource.values()].sort(sortRows),
    byCampaign: [...byCampaign.values()].sort(sortRows),
  }
}
