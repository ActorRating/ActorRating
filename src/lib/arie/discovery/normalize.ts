/**
 * Normalize provider payloads into discovery candidates.
 */

import type {
  DiscoveryMethod,
  PublicMetrics,
  RawDiscoveryPost,
} from "@/lib/arie/discovery/types"
import type { XTweetFields, XUser } from "@/lib/arie/discovery/x-read"

export function mapPublicMetrics(raw?: XTweetFields["public_metrics"]): PublicMetrics | null {
  if (!raw) return null
  return {
    retweetCount: raw.retweet_count,
    replyCount: raw.reply_count,
    likeCount: raw.like_count,
    quoteCount: raw.quote_count,
    impressionCount: raw.impression_count,
    bookmarkCount: raw.bookmark_count,
  }
}

export function buildTweetUrl(handle: string | null, tweetId: string): string {
  if (handle) return `https://x.com/${handle}/status/${tweetId}`
  return `https://x.com/i/web/status/${tweetId}`
}

export function normalizeHandle(handle: string | null | undefined): string | null {
  if (!handle) return null
  const h = handle.replace(/^@/, "").trim().toLowerCase()
  return h || null
}

/**
 * Keyword search has no `exclude=` param — reply/retweet filters are query operators.
 * Append `-is:reply` when missing. Do not strip or rewrite existing `-is:retweet`.
 */
export function withKeywordReplyFilter(query: string): string {
  const q = query.trim()
  if (!q) return q
  if (/(^|\s)-is:reply(\s|$)/i.test(q)) return q
  return `${q} -is:reply`
}

/**
 * Conservative conversation-fragment heuristic (no extra X tweet fields).
 * Drops posts whose text is reply-addressing (`@user …`). Quote tweets typically
 * do not start with @handle and are kept.
 */
export function isConversationFragmentText(text: string): boolean {
  const t = text.trim()
  if (!t.startsWith("@")) return false
  return /^@[A-Za-z0-9_]{1,15}(?:\s+@[A-Za-z0-9_]{1,15})*(?:\s|$)/.test(t)
}

/**
 * Resolve author handle with fallbacks:
 * 1. Expanded user from includes
 * 2. Configured discovery source handle (account timeline)
 * 3. null
 */
export function resolveAuthorHandle(input: {
  expandedUsername?: string | null
  fallbackHandle?: string | null
}): string | null {
  return normalizeHandle(input.expandedUsername) ?? normalizeHandle(input.fallbackHandle)
}

export function normalizeXTweet(input: {
  tweet: XTweetFields
  usersById: Map<string, XUser>
  discoveryMethod: DiscoveryMethod
  /** Known account handle when expansions are missing. */
  fallbackHandle?: string | null
}): RawDiscoveryPost | null {
  const text = input.tweet.text?.trim() ?? ""
  if (!text || !input.tweet.id) return null
  if (isConversationFragmentText(text)) return null

  const authorId = input.tweet.author_id ?? null
  const user = authorId ? input.usersById.get(authorId) : undefined
  const handle = resolveAuthorHandle({
    expandedUsername: user?.username,
    fallbackHandle: input.fallbackHandle,
  })

  let sourcePublishedAt: Date | null = null
  if (input.tweet.created_at) {
    const d = new Date(input.tweet.created_at)
    if (!Number.isNaN(d.getTime())) sourcePublishedAt = d
  }

  return {
    provider: "X",
    externalPostId: input.tweet.id,
    authorHandle: handle,
    authorId,
    text,
    sourceUrl: buildTweetUrl(handle, input.tweet.id),
    sourcePublishedAt,
    discoveryMethod: input.discoveryMethod,
    language: input.tweet.lang ?? null,
    publicMetrics: mapPublicMetrics(input.tweet.public_metrics),
  }
}

export function usersMapFromIncludes(users?: XUser[]): Map<string, XUser> {
  const map = new Map<string, XUser>()
  for (const u of users ?? []) {
    if (u.id) map.set(u.id, u)
  }
  return map
}

export function normalizeXTimeline(input: {
  tweets: XTweetFields[]
  users?: XUser[]
  discoveryMethod: DiscoveryMethod
  fallbackHandle?: string | null
}): RawDiscoveryPost[] {
  const usersById = usersMapFromIncludes(input.users)
  const out: RawDiscoveryPost[] = []
  for (const tweet of input.tweets) {
    const post = normalizeXTweet({
      tweet,
      usersById,
      discoveryMethod: input.discoveryMethod,
      fallbackHandle: input.fallbackHandle,
    })
    if (post) out.push(post)
  }
  return out
}
