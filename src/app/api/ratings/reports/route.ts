export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUserId } from "@/lib/authUser"
import { checkRateLimitScopes } from "@/lib/rateLimit"
import { getClientIp } from "@/lib/requestProtection"
import { isReportReason } from "@/lib/validation/ratingComment"

/**
 * Report a micro-review (signed-in users only; cannot report own).
 */
export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const clientIp = getClientIp(request)
    const limit = await checkRateLimitScopes({
      ip: clientIp,
      action: "profileUpdate",
      userId,
    })
    if (!limit.allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const body = (await request.json()) as {
      ratingId?: string
      reason?: string
      details?: string
    }

    const ratingId = typeof body.ratingId === "string" ? body.ratingId.trim() : ""
    if (!ratingId) {
      return NextResponse.json({ error: "ratingId is required" }, { status: 400 })
    }

    const reasonRaw = typeof body.reason === "string" ? body.reason.trim().toLowerCase() : ""
    if (!isReportReason(reasonRaw)) {
      return NextResponse.json({ error: "Invalid report reason" }, { status: 400 })
    }

    const details =
      typeof body.details === "string" ? body.details.trim().slice(0, 300) || null : null

    const rating = await prisma.rating.findUnique({
      where: { id: ratingId },
      select: {
        id: true,
        userId: true,
        comment: true,
        commentHidden: true,
      },
    })

    if (!rating || !rating.comment?.trim() || rating.commentHidden) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 })
    }

    if (rating.userId === userId) {
      return NextResponse.json({ error: "You can’t report your own review" }, { status: 400 })
    }

    const existing = await prisma.ratingCommentReport.findUnique({
      where: {
        ratingId_reporterUserId: {
          ratingId,
          reporterUserId: userId,
        },
      },
      select: { id: true, status: true },
    })

    if (existing) {
      return NextResponse.json({ success: true, alreadyReported: true })
    }

    await prisma.ratingCommentReport.create({
      data: {
        ratingId,
        reporterUserId: userId,
        reason: reasonRaw,
        details,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Report review error:", error)
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 })
  }
}
