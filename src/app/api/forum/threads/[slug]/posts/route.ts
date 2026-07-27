export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUserId } from "@/lib/authUser"
import { checkRateLimitScopes } from "@/lib/rateLimit"
import { getClientIp } from "@/lib/requestProtection"
import { sanitizeForumPostContent } from "@/lib/forum/validation"
import { parseIsSpoiler } from "@/lib/validation/ratingComment"

type Params = { params: Promise<{ slug: string }> }

/** Reply to a thread (signed-in; locked threads reject). */
export async function POST(request: NextRequest, { params }: Params) {
  try {
    const userId = await getAuthenticatedUserId()
    if (!userId) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { slug } = await params
    const threadSlug = slug?.trim()
    if (!threadSlug) {
      return NextResponse.json({ error: "Slug required" }, { status: 400 })
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

    const body = (await request.json()) as { content?: string; isSpoiler?: unknown }
    const contentResult = sanitizeForumPostContent(body.content)
    if (!contentResult.ok) {
      return NextResponse.json({ error: contentResult.error }, { status: 400 })
    }

    const thread = await prisma.forumThread.findUnique({
      where: { slug: threadSlug },
      select: { id: true, isLocked: true },
    })
    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 })
    }
    if (thread.isLocked) {
      return NextResponse.json({ error: "This thread is locked" }, { status: 403 })
    }

    const isSpoiler = parseIsSpoiler(body.isSpoiler)
    const now = new Date()

    const post = await prisma.$transaction(async (tx) => {
      const created = await tx.forumPost.create({
        data: {
          threadId: thread.id,
          authorId: userId,
          content: contentResult.content,
          isSpoiler,
          isOriginal: false,
        },
        select: {
          id: true,
          content: true,
          isSpoiler: true,
          isOriginal: true,
          createdAt: true,
          authorId: true,
          author: { select: { username: true, name: true } },
        },
      })

      await tx.forumThread.update({
        where: { id: thread.id },
        data: { updatedAt: now },
      })

      return created
    })

    return NextResponse.json(
      {
        post: {
          id: post.id,
          content: post.content,
          isSpoiler: post.isSpoiler,
          isOriginal: post.isOriginal,
          createdAt: post.createdAt.toISOString(),
          authorId: post.authorId,
          username: post.author.username,
          displayName: post.author.username
            ? `@${post.author.username}`
            : post.author.name?.trim() || "User",
        },
      },
      { status: 201 },
    )
  } catch (error) {
    console.error("Forum reply error:", error)
    return NextResponse.json({ error: "Failed to post reply" }, { status: 500 })
  }
}
