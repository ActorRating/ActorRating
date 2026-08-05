export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { completeIncompleteMovies } from "@/lib/admin/addMovieFromTitle"

async function requireAdmin() {
  const session = await auth()
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const email = session?.user?.email?.toLowerCase().trim()
  if (!adminEmail || !email || email !== adminEmail) {
    return null
  }
  return session
}

/**
 * Backfill movies missing poster / slug / castIngestedAt (or empty system cast).
 * Body: { take?: number } default 40
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    let take = 40
    try {
      const body = (await request.json()) as { take?: number }
      if (typeof body.take === "number") take = body.take
    } catch {
      // empty body ok
    }

    const result = await completeIncompleteMovies(prisma, { take })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    console.error("complete-incomplete-movies failed:", error)
    return NextResponse.json({ error: "Backfill failed" }, { status: 500 })
  }
}
