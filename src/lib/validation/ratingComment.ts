import { containsBadWord } from "@/lib/validation/sanitizeName"

export const COMMENT_MAX_LENGTH = 800

export const REPORT_REASONS = ["spam", "abuse", "spoiler", "other"] as const
export type ReportReason = (typeof REPORT_REASONS)[number]

export function isReportReason(value: string): value is ReportReason {
  return (REPORT_REASONS as readonly string[]).includes(value)
}

export type SanitizeCommentResult =
  | { ok: true; comment: string | null }
  | { ok: false; error: string }

/**
 * Optional micro-review text attached to a rating.
 * Empty → null. Hard profanity → reject.
 */
export function sanitizeRatingComment(raw: unknown): SanitizeCommentResult {
  if (raw == null) return { ok: true, comment: null }
  if (typeof raw !== "string") {
    return { ok: false, error: "Comment must be text" }
  }

  const trimmed = raw.trim().replace(/\s+/g, " ")
  if (!trimmed) return { ok: true, comment: null }

  if (trimmed.length > COMMENT_MAX_LENGTH) {
    return {
      ok: false,
      error: `Comment must be ${COMMENT_MAX_LENGTH} characters or fewer`,
    }
  }

  if (containsBadWord(trimmed)) {
    return {
      ok: false,
      error: "Please keep your review constructive — that language isn’t allowed",
    }
  }

  return { ok: true, comment: trimmed }
}

export function parseIsSpoiler(raw: unknown): boolean {
  return raw === true || raw === "true" || raw === 1
}
