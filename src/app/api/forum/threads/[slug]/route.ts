export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = { params: Promise<{ slug: string }> }

/** Public thread detail with visible posts. */
export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const { slug } = await params
    const threadSlug = slug?.trim()
    if (!threadSlug) {
      return NextResponse.json({ error: "Slug required" }, { status: 400 })
    }

    const thread = await prisma.forumThread.findUnique({
      where: { slug: threadSlug },
      select: {
        id: true,
        title: true,
        slug: true,
        isLocked: true,
        isPinned: true,
        createdAt: true,
        updatedAt: true,
        author: { select: { id: true, username: true, name: true } },
        category: { select: { name: true, slug: true } },
        actor: { select: { id: true, name: true, slug: true } },
        movie: { select: { id: true, title: true, slug: true, year: true } },
        posts: {
          where: { isHidden: false },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            content: true,
            isSpoiler: true,
            isOriginal: true,
            createdAt: true,
            authorId: true,
            author: { select: { username: true, name: true } },
          },
        },
      },
    })

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 })
    }

    return NextResponse.json({
      thread: {
        id: thread.id,
        title: thread.title,
        slug: thread.slug,
        isLocked: thread.isLocked,
        isPinned: thread.isPinned,
        createdAt: thread.createdAt.toISOString(),
        updatedAt: thread.updatedAt.toISOString(),
        author: {
          id: thread.author.id,
          username: thread.author.username,
          displayName: thread.author.username
            ? `@${thread.author.username}`
            : thread.author.name?.trim() || "User",
        },
        category: thread.category,
        actor: thread.actor,
        movie: thread.movie,
        posts: thread.posts.map((p) => ({
          id: p.id,
          content: p.content,
          isSpoiler: p.isSpoiler,
          isOriginal: p.isOriginal,
          createdAt: p.createdAt.toISOString(),
          authorId: p.authorId,
          username: p.author.username,
          displayName: p.author.username
            ? `@${p.author.username}`
            : p.author.name?.trim() || "User",
        })),
      },
    })
  } catch (error) {
    console.error("Forum thread detail error:", error)
    return NextResponse.json({ error: "Failed to load thread" }, { status: 500 })
  }
}
