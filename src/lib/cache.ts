import { Redis } from '@upstash/redis'

type CacheValue = unknown

let redis: Redis | null = null

function getRedis(): Redis | null {
  if (redis !== null) return redis
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (url && token) {
    redis = new Redis({ url, token })
    return redis
  }
  return null
}

// Fallback in-memory cache if Redis is not configured
const memoryStore = new Map<string, { value: CacheValue; expiresAt: number }>()

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  const r = getRedis()
  if (r) {
    const val = await r.get<T>(key)
    return (val as T) ?? null
  }
  const entry = memoryStore.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key)
    return null
  }
  return entry.value as T
}

export async function cacheSet(key: string, value: CacheValue, ttlSeconds: number): Promise<void> {
  const r = getRedis()
  if (r) {
    await r.set(key, value, { ex: ttlSeconds })
    return
  }
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 })
}

export function makeCacheKey(namespace: string, parts: Array<string | number | undefined | null>): string {
  const serialized = parts.map((p) => (p === undefined || p === null ? '' : String(p))).join('::')
  return `ar:${namespace}:${serialized}`
}

export async function cacheDelete(key: string): Promise<void> {
  const r = getRedis()
  if (r) {
    try {
      await r.del(key)
      return
    } catch {
      // ignore
    }
  }
  memoryStore.delete(key)
}


