export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { getAuthenticatedUserId } from "@/lib/authUser"
import {
  ANON_COOKIE_NAME,
  clearAnonCookie,
  verifySignedAnonId,
} from "@/lib/anonymous-session"
import { migrateAnonRatingsToUser } from "@/lib/migrate-anon-ratings"

/** After sign-in, reassign anonymous ratings to the authenticated user. Idempotent. */
export async function POST(_request: NextRequest) {
  const userId = await getAuthenticatedUserId()
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const cookieStore = await cookies()
  const raw = cookieStore.get(ANON_COOKIE_NAME)?.value
  const anonId = verifySignedAnonId(raw)

  if (!anonId) {
    return NextResponse.json({ migrated: 0, merged: 0 })
  }

  const result = await migrateAnonRatingsToUser(anonId, userId)
  const response = NextResponse.json(result)
  clearAnonCookie(response)
  return response
}
