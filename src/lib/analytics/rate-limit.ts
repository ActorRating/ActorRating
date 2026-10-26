import { Redis } from "@upstash/redis"
import { checkMemoryIpRateLimit } from "@/lib/requestProtection"

/**
 * Fixed-window counter shared across instances/deploys when Upstash Redis is
 * configured (UPSTASH_REDIS_REST_URL / _TOKEN); otherwise falls back to the
 * process-local Map (resets on every Coolify deploy, not shared between replicas).
 */

let redis: Redis | null | undefined

function getRedis(): Redis | null {
  if (redis !== undefined) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  redis = url && token ? new Redis({ url, token }) : null
  return redis
}

/** Test seam. */
export function resetSharedRateLimitClientForTests(): void {
  redis = undefined
}

export type SharedWindowStore = Map<string, { count: number; resetAt: number }>

/**
 * Returns true while under budget, false once `maxRequests` is exceeded in
 * the window. Never throws — Redis failures degrade to the memory store.
 */
export async function checkSharedRateLimit(
  namespace: string,
  key: string,
  opts: { windowMs: number; maxRequests: number },
  memoryStore: SharedWindowStore,
): Promise<boolean> {
  const r = getRedis()
  if (r) {
    try {
      const windowSec = Math.max(1, Math.ceil(opts.windowMs / 1000))
      const bucket = Math.floor(Date.now() / opts.windowMs)
      const redisKey = `ar:rl:${namespace}:${bucket}:${key}`
      const count = await r.incr(redisKey)
      if (count === 1) {
        await r.expire(redisKey, windowSec + 1)
      }
      return count <= opts.maxRequests
    } catch {
      // fall through to memory
    }
  }
  return checkMemoryIpRateLimit(memoryStore, key, opts)
}
