import { NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { applyInternalTrafficCookie } from "@/lib/analytics/internal-traffic"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * Sets `ar_internal=1` after a successful admin session check.
 * Analytics-only cookie — never used for authorization.
 */
export async function POST() {
  const admin = await requireAdminSession()
  if (!admin) {
    return new NextResponse(null, { status: 401 })
  }
  const res = new NextResponse(null, { status: 204 })
  applyInternalTrafficCookie(res)
  return res
}
