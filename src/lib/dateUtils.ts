/**
 * Normalize a value that may be a Date or an ISO string (e.g. from cache/serialization) to an ISO string.
 * Use when building payloads from Prisma/cache where dates can be serialized as strings.
 */
export function toIsoDate(v: Date | string | undefined | null): string {
  if (v == null) return new Date().toISOString()
  if (typeof v === "string") return v
  if (v instanceof Date) return v.toISOString()
  return new Date().toISOString()
}

/** Normalize createdAt/updatedAt on an entity (actor, movie, or performance) for safe client props. */
export function withIsoDates<T extends Record<string, unknown>>(obj: T): T {
  if (!obj || typeof obj !== "object") return obj
  const out = { ...obj }
  if ("createdAt" in out) out.createdAt = toIsoDate(out.createdAt as Date | string | null | undefined)
  if ("updatedAt" in out) out.updatedAt = toIsoDate(out.updatedAt as Date | string | null | undefined)
  return out as T
}
