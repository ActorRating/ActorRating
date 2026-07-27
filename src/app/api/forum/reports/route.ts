export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUserId } from "@/lib/authUser"
import { checkRateLimitScopes } from "@/lib/rateLimit"
import { getClientIp } from "@/lib/requestProtection"
import { isReportReason } from "@/lib/validation/ratingComment"

/**
 * Report a forum post (signed-in; cannot report own).
 * Feeds the shared admin moderation queue.
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
      postId?: string
      reason?: string
      details?: string
    }

    const postId = typeof body.postId === "string" ? body.postId.trim() : ""
    if (!postId) {
      return NextResponse.json({ error: "postId is required" }, { status: 400 })
    }

    const reasonRaw = typeof body.reason === "string" ? body.reason.trim().toLowerCase() : ""
    if (!isReportReason(reasonRaw)) {
      return NextResponse.json({ error: "Invalid report reason" }, { status: 400 })
    }

    const details =
      typeof body.details === "string" ? body.details.trim().slice(0, 300) || null : null

    const post = await prisma.forumPost.findUnique({
      where: { id: postId },
      select: { id: true, authorId: true, isHidden: true },
    })

    if (!post || post.isHidden) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    if (post.authorId === userId) {
      return NextResponse.json({ error: "You can’t report your own post" }, { status: 400 })
    }

    const existing = await prisma.forumPostReport.findUnique({
      where: {
        postId_reporterUserId: {
          postId,
          reporterUserId: userId,
        },
      },
      select: { id: true },
    })

    if (existing) {
      return NextResponse.json({ success: true, alreadyReported: true })
    }

    await prisma.forumPostReport.create({
      data: {
        postId,
        reporterUserId: userId,
        reason: reasonRaw,
        details,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Forum report error:", error)
    return NextResponse.json({ error: "Failed to submit report" }, { status: 500 })
  }
}
