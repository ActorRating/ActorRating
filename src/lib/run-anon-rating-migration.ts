import "server-only"
import { cookies } from "next/headers"
import {
  ANON_COOKIE_NAME,
  anonCookieOptions,
  verifySignedAnonId,
} from "@/lib/anonymous-session"
import { migrateAnonRatingsToUser } from "@/lib/migrate-anon-ratings"

/** Server-side guest → account rating handoff (safe to call repeatedly). */
export async function migrateAnonRatingsFromRequestCookie(
  userId: string,
): Promise<{ migrated: number; merged: number }> {
  const store = await cookies()
  const raw = store.get(ANON_COOKIE_NAME)?.value
  const anonId = verifySignedAnonId(raw)
  if (!anonId) return { migrated: 0, merged: 0 }

  const result = await migrateAnonRatingsToUser(anonId, userId)
  store.set(ANON_COOKIE_NAME, "", { ...anonCookieOptions(), maxAge: 0 })
  return result
}
