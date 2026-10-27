import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/**
 * Read-time exclusion of operator accounts from admin traffic analytics.
 * Never used for auth. Never applied to public community scores / product pages.
 *
 * Sources (merged, deduped):
 * - `INTERNAL_USER_IDS` — comma-separated User ids
 * - User whose email equals `ADMIN_EMAIL` (case-insensitive)
 */

type CacheEntry = { at: number; ids: string[] }

let cache: CacheEntry | null = null
const CACHE_TTL_MS = 60_000

/** Pure: parse `INTERNAL_USER_IDS` only (no DB). */
export function parseInternalUserIdsFromEnv(
  raw: string | undefined = process.env.INTERNAL_USER_IDS,
): string[] {
  if (!raw?.trim()) return []
  const out: string[] = []
  const seen = new Set<string>()
  for (const part of raw.split(",")) {
    const id = part.trim()
    if (!id || seen.has(id)) continue
    seen.add(id)
    out.push(id)
  }
  return out
}

/** Test seam: clear the short process cache. */
export function resetInternalUserIdsCacheForTests(): void {
  cache = null
}

/**
 * Resolve the full internal id list (env + ADMIN_EMAIL user).
 * Cached briefly so Promise.all metric loaders don't re-query User each time.
 */
export async function resolveInternalUserIds(): Promise<string[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) {
    return cache.ids
  }

  const ids = new Set(parseInternalUserIdsFromEnv())
  const adminEmail = process.env.ADMIN_EMAIL?.trim()
  if (adminEmail) {
    try {
      const user = await prisma.user.findFirst({
        where: { email: { equals: adminEmail, mode: "insensitive" } },
        select: { id: true },
      })
      if (user?.id) ids.add(user.id)
    } catch {
      // Analytics must not break if User lookup fails
    }
  }

  const list = [...ids]
  cache = { at: Date.now(), ids: list }
  return list
}

/**
 * SQL predicate: keep rows whose userId is null (guest) or not in the internal set.
 * Empty list → `TRUE` (no filter).
 *
 * @param columnSql identifier fragment, e.g. `"userId"` or `pv."userId"`
 */
export function sqlUserIdNotInternal(
  ids: string[],
  columnSql = `"userId"`,
): Prisma.Sql {
  if (ids.length === 0) return Prisma.sql`TRUE`
  return Prisma.sql`(${Prisma.raw(columnSql)} IS NULL OR ${Prisma.raw(columnSql)} NOT IN (${Prisma.join(ids)}))`
}

/**
 * Prisma `where` fragment for findMany. Empty list → `{}` (no filter).
 * Guests (`userId: null`) are kept.
 */
export function prismaWhereUserIdNotInternal(ids: string[]):
  | Record<string, never>
  | { OR: Array<{ userId: null } | { userId: { notIn: string[] } }> } {
  if (ids.length === 0) return {}
  return {
    OR: [{ userId: null }, { userId: { notIn: ids } }],
  }
}
