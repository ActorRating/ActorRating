export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"

async function requireAdmin() {
  const session = await auth()
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim()
  const email = session?.user?.email?.toLowerCase().trim()
  if (!email || !adminEmail || email !== adminEmail) {
    return null
  }
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  return user
}

/** List open (or filtered) reports — micro-reviews + forum posts. */
export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const statusParam = request.nextUrl.searchParams.get("status") ?? "OPEN"
    const status =
      statusParam === "RESOLVED" || statusParam === "DISMISSED" || statusParam === "OPEN"
        ? statusParam
        : "OPEN"

    const [reviewReports, forumReports] = await Promise.all([
      prisma.ratingCommentReport.findMany({
        where: { status },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          reason: true,
          details: true,
          status: true,
          createdAt: true,
          rating: {
            select: {
              id: true,
              comment: true,
              isSpoiler: true,
              commentHidden: true,
              weightedScore: true,
              actor: { select: { name: true } },
              movie: { select: { title: true, year: true } },
              user: { select: { username: true, email: true } },
            },
          },
          reporter: {
            select: { username: true, email: true },
          },
        },
      }),
      prisma.forumPostReport.findMany({
        where: { status },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          reason: true,
          details: true,
          status: true,
          createdAt: true,
          post: {
            select: {
              id: true,
              content: true,
              isSpoiler: true,
              isHidden: true,
              thread: { select: { title: true, slug: true } },
              author: { select: { username: true, email: true } },
            },
          },
          reporter: {
            select: { username: true, email: true },
          },
        },
      }),
    ])

    const reports = [
      ...reviewReports.map((r) => ({
        kind: "review" as const,
        id: r.id,
        reason: r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.createdAt,
        rating: r.rating,
        reporter: r.reporter,
      })),
      ...forumReports.map((r) => ({
        kind: "forum" as const,
        id: r.id,
        reason: r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.createdAt,
        post: r.post,
        reporter: r.reporter,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())

    return NextResponse.json({ reports })
  } catch (error) {
    console.error("Admin moderation list error:", error)
    return NextResponse.json({ error: "Failed to load reports" }, { status: 500 })
  }
}

type Body = {
  reportId?: string
  kind?: "review" | "forum"
  action?: "dismiss" | "hide"
}

/** Dismiss a report or hide the reported content (and resolve the report). */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as Body
    const reportId = typeof body.reportId === "string" ? body.reportId.trim() : ""
    const action = body.action
    const kind = body.kind === "forum" ? "forum" : "review"
    if (!reportId || (action !== "dismiss" && action !== "hide")) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 })
    }

    const now = new Date()

    if (kind === "forum") {
      const report = await prisma.forumPostReport.findUnique({
        where: { id: reportId },
        select: { id: true, postId: true, status: true },
      })
      if (!report) {
        return NextResponse.json({ error: "Report not found" }, { status: 404 })
      }

      if (action === "hide") {
        await prisma.$transaction([
          prisma.forumPost.update({
            where: { id: report.postId },
            data: { isHidden: true },
          }),
          prisma.forumPostReport.updateMany({
            where: { postId: report.postId, status: "OPEN" },
            data: {
              status: "RESOLVED",
              resolvedAt: now,
              resolvedByUserId: admin.id,
            },
          }),
        ])
      } else {
        await prisma.forumPostReport.update({
          where: { id: report.id },
          data: {
            status: "DISMISSED",
            resolvedAt: now,
            resolvedByUserId: admin.id,
          },
        })
      }

      return NextResponse.json({ success: true })
    }

    const report = await prisma.ratingCommentReport.findUnique({
      where: { id: reportId },
      select: { id: true, ratingId: true, status: true },
    })
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 })
    }

    if (action === "hide") {
      await prisma.$transaction([
        prisma.rating.update({
          where: { id: report.ratingId },
          data: { commentHidden: true },
        }),
        prisma.ratingCommentReport.updateMany({
          where: { ratingId: report.ratingId, status: "OPEN" },
          data: {
            status: "RESOLVED",
            resolvedAt: now,
            resolvedByUserId: admin.id,
          },
        }),
      ])
    } else {
      await prisma.ratingCommentReport.update({
        where: { id: report.id },
        data: {
          status: "DISMISSED",
          resolvedAt: now,
          resolvedByUserId: admin.id,
        },
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Admin moderation action error:", error)
    return NextResponse.json({ error: "Failed to update report" }, { status: 500 })
  }
}
