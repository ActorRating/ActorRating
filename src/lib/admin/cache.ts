type CacheEntry<T> = {
  data: T
  expires: number
}

const cache = new Map<string, CacheEntry<unknown>>()

export function getCache<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() > entry.expires) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

export function setCache<T>(key: string, data: T, ttlMs: number) {
  cache.set(key, {
    data,
    expires: Date.now() + ttlMs,
  })
}
