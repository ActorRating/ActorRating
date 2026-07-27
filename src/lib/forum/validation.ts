import { createSlug } from "@/lib/createSlug"
import { containsBadWord } from "@/lib/validation/sanitizeName"
import { COMMENT_MAX_LENGTH } from "@/lib/validation/ratingComment"

export const FORUM_POST_MAX_LENGTH = 4000
export const FORUM_TITLE_MAX_LENGTH = 120

export function forumThreadSlug(title: string): string {
  const base = createSlug(title).slice(0, 60) || "thread"
  return `${base}-${Date.now().toString(36)}`
}

export function sanitizeForumTitle(raw: unknown): { ok: true; title: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "Title is required" }
  const title = raw.trim().replace(/\s+/g, " ")
  if (title.length < 8) return { ok: false, error: "Title must be at least 8 characters" }
  if (title.length > FORUM_TITLE_MAX_LENGTH) {
    return { ok: false, error: `Title must be ${FORUM_TITLE_MAX_LENGTH} characters or fewer` }
  }
  if (containsBadWord(title)) {
    return { ok: false, error: "Please keep titles constructive" }
  }
  return { ok: true, title }
}

export function sanitizeForumPostContent(
  raw: unknown,
): { ok: true; content: string } | { ok: false; error: string } {
  if (typeof raw !== "string") return { ok: false, error: "Content is required" }
  const content = raw.trim()
  if (content.length < 12) return { ok: false, error: "Post must be at least 12 characters" }
  if (content.length > FORUM_POST_MAX_LENGTH) {
    return { ok: false, error: `Post must be ${FORUM_POST_MAX_LENGTH} characters or fewer` }
  }
  if (containsBadWord(content)) {
    return { ok: false, error: "Please keep discussions constructive — that language isn’t allowed" }
  }
  return { ok: true, content }
}

/** Reuse review length helper naming for micro consistency where needed. */
export { COMMENT_MAX_LENGTH }
