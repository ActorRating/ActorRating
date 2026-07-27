export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUserId } from "@/lib/authUser"
import { checkRateLimitScopes } from "@/lib/rateLimit"
import { getClientIp } from "@/lib/requestProtection"
import {
  forumThreadSlug,
  sanitizeForumPostContent,
  sanitizeForumTitle,
} from "@/lib/forum/validation"
import { parseIsSpoiler } from "@/lib/validation/ratingComment"

function mapThreadSummary(t: {
  id: string
  title: string
  slug: string
  isLocked: boolean
  isPinned: boolean
  createdAt: Date
  updatedAt: Date
  author: { username: string | null; name: string | null }
  category: { name: string; slug: string }
  actor: { name: string; slug: string | null } | null
  movie: { title: string; slug: string | null; year: number } | null
  _count: { posts: number }
}) {
  return {
    id: t.id,
    title: t.title,
    slug: t.slug,
    isLocked: t.isLocked,
    isPinned: t.isPinned,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    postCount: t._count.posts,
    author: {
      username: t.author.username,
      displayName: t.author.username
        ? `@${t.author.username}`
        : t.author.name?.trim() || "User",
    },
    category: t.category,
    actor: t.actor,
    movie: t.movie,
  }
}

const threadSelect = {
  id: true,
  title: true,
  slug: true,
  isLocked: true,
  isPinned: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { username: true, name: true } },
  category: { select: { name: true, slug: true } },
  actor: { select: { name: true, slug: true } },
  movie: { select: { title: true, slug: true, year: true } },
  _count: { select: { posts: true } },
} as const

/** List threads (optional category slug filter). */
export async function GET(request: NextRequest) {
  try {
    const categorySlug = request.nextUrl.searchParams.get("category")?.trim()
    const takeRaw = Number(request.nextUrl.searchParams.get("limit") ?? "40")
    const take = Number.isFinite(takeRaw) ? Math.min(Math.max(takeRaw, 1), 80) : 40

    let categoryId: string | undefined
    if (categorySlug) {
      const cat = await prisma.forumCategory.findUnique({
        where: { slug: categorySlug },
        select: { id: true },
      })
      if (!cat) {
        return NextResponse.json({ error: "Category not found" }, { status: 404 })
      }
      categoryId = cat.id
    }

    const threads = await prisma.forumThread.findMany({
      where: categoryId ? { categoryId } : undefined,
      orderBy: [{ isPinned: "desc" }, { updatedAt: "desc" }],
      take,
      select: threadSelect,
    })

    return NextResponse.json({ threads: threads.map(mapThreadSummary) })
  } catch (error) {
    console.error("Forum threads list error:", error)
    return NextResponse.json({ error: "Failed to load threads" }, { status: 500 })
  }
}

/** Create a new thread with an original post (signed-in). */
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
      categorySlug?: string
      title?: string
      content?: string
      isSpoiler?: unknown
      actorId?: string
      movieId?: string
    }

    const categorySlug =
      typeof body.categorySlug === "string" ? body.categorySlug.trim() : ""
    if (!categorySlug) {
      return NextResponse.json({ error: "categorySlug is required" }, { status: 400 })
    }

    const titleResult = sanitizeForumTitle(body.title)
    if (!titleResult.ok) {
      return NextResponse.json({ error: titleResult.error }, { status: 400 })
    }

    const contentResult = sanitizeForumPostContent(body.content)
    if (!contentResult.ok) {
      return NextResponse.json({ error: contentResult.error }, { status: 400 })
    }

    const category = await prisma.forumCategory.findUnique({
      where: { slug: categorySlug },
      select: { id: true },
    })
    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 })
    }

    const actorId =
      typeof body.actorId === "string" && body.actorId.trim() ? body.actorId.trim() : null
    const movieId =
      typeof body.movieId === "string" && body.movieId.trim() ? body.movieId.trim() : null

    if (actorId) {
      const actor = await prisma.actor.findUnique({ where: { id: actorId }, select: { id: true } })
      if (!actor) {
        return NextResponse.json({ error: "Actor not found" }, { status: 400 })
      }
    }
    if (movieId) {
      const movie = await prisma.movie.findUnique({ where: { id: movieId }, select: { id: true } })
      if (!movie) {
        return NextResponse.json({ error: "Movie not found" }, { status: 400 })
      }
    }

    const slug = forumThreadSlug(titleResult.title)
    const isSpoiler = parseIsSpoiler(body.isSpoiler)

    const thread = await prisma.$transaction(async (tx) => {
      const created = await tx.forumThread.create({
        data: {
          title: titleResult.title,
          slug,
          categoryId: category.id,
          authorId: userId,
          actorId,
          movieId,
        },
        select: threadSelect,
      })

      await tx.forumPost.create({
        data: {
          threadId: created.id,
          authorId: userId,
          content: contentResult.content,
          isSpoiler,
          isOriginal: true,
        },
      })

      return created
    })

    return NextResponse.json({ thread: mapThreadSummary(thread) }, { status: 201 })
  } catch (error) {
    console.error("Forum thread create error:", error)
    return NextResponse.json({ error: "Failed to create thread" }, { status: 500 })
  }
}
