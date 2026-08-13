/**
 * ARIE Discovery Engine V1 — provider abstraction and shared types.
 * Discovery finds candidates; Scout decides editorial quality.
 */

export type DiscoveryMethod = "account_timeline" | "keyword_search"

export type DiscoveryRunStatus =
  | "RUNNING"
  | "SUCCESS"
  | "PARTIAL"
  | "RATE_LIMITED"
  | "ERROR"
  | "NO_RESULTS"
  | "DISABLED"

export type DiscoveryProviderCapability =
  | "user_lookup"
  | "user_timeline"
  | "recent_search"

export type PublicMetrics = {
  retweetCount?: number
  replyCount?: number
  likeCount?: number
  quoteCount?: number
  impressionCount?: number
  bookmarkCount?: number
}

export type RawDiscoveryPost = {
  provider: string
  externalPostId: string
  authorHandle: string | null
  authorId: string | null
  text: string
  sourceUrl: string | null
  sourcePublishedAt: Date | null
  discoveryMethod: DiscoveryMethod
  language?: string | null
  publicMetrics?: PublicMetrics | null
}

export type DiscoveryProviderHealth = {
  ok: boolean
  provider: string
  authConfigured: boolean
  authMethod: "oauth1_user_context" | "bearer" | "none"
  oauth1Configured: boolean
  bearerConfigured: boolean
  capabilities: Record<DiscoveryProviderCapability, boolean>
  lastError?: string
  rateLimitRemaining?: number | null
}

export type DiscoveryFetchResult =
  | {
      ok: true
      posts: RawDiscoveryPost[]
      partial?: boolean
      rateLimited?: boolean
      errorCode?: string
    }
  | {
      ok: false
      reason: string
      status?: number
      rateLimited?: boolean
      partial?: boolean
    }

export type AccountSourceRequest = {
  handle: string
  authorId?: string | null
  maxResults?: number
  sinceId?: string | null
  lookbackMinutes?: number
}

export type KeywordSourceRequest = {
  query: string
  maxResults?: number
  lookbackMinutes?: number
}

export interface DiscoveryProvider {
  sourceName(): string
  health(): Promise<DiscoveryProviderHealth>
  getPostsFromAccounts(input: AccountSourceRequest): Promise<DiscoveryFetchResult>
  searchPosts(input: KeywordSourceRequest): Promise<DiscoveryFetchResult>
}

export type DiscoverySourceConfig = {
  sourceType: "account" | "keyword"
  handle?: string
  query?: string
  enabled?: boolean
  priority?: number
  topicTags?: string[]
  pollIntervalMinutes?: number
  maxCandidatesPerPoll?: number
}
