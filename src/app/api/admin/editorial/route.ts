export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { Prisma, type EditorialStatus } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/admin/requireAdmin"

const STATUSES: EditorialStatus[] = ["DRAFT", "PUBLISHED", "HUMAN_LOCKED", "NEEDS_REGEN"]

export async function GET(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const q = request.nextUrl.searchParams.get("q")?.trim() || ""
    const statusParam = request.nextUrl.searchParams.get("status")?.trim() || ""
    const status =
      statusParam && STATUSES.includes(statusParam as EditorialStatus)
        ? (statusParam as EditorialStatus)
        : null
    const take = Math.min(Number(request.nextUrl.searchParams.get("take") ?? "50") || 50, 100)

    const where: Prisma.PerformanceEditorialWhereInput = {
      AND: [
        status ? { status } : {},
        q
          ? {
              OR: [
                { actor: { name: { contains: q, mode: "insensitive" } } },
                { actor: { slug: { contains: q, mode: "insensitive" } } },
                { movie: { title: { contains: q, mode: "insensitive" } } },
                { movie: { slug: { contains: q, mode: "insensitive" } } },
              ],
            }
          : {},
      ],
    }

    const [items, counts] = await Promise.all([
      prisma.performanceEditorial.findMany({
        where,
        orderBy: [{ updatedAt: "desc" }],
        take,
        select: {
          id: true,
          status: true,
          wordCount: true,
          spoilerFree: true,
          promptVersion: true,
          model: true,
          generatedAt: true,
          publishedAt: true,
          updatedAt: true,
          editedByEmail: true,
          actor: { select: { id: true, name: true, slug: true } },
          movie: { select: { id: true, title: true, year: true, slug: true } },
        },
      }),
      prisma.performanceEditorial.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
    ])

    return NextResponse.json({
      items,
      counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const missingTable =
      msg.includes("PerformanceEditorial") ||
      msg.includes("does not exist") ||
      msg.includes("P2021")
    return NextResponse.json(
      {
        error: missingTable
          ? "PerformanceEditorial table missing — run prisma migrate deploy on the server."
          : msg,
      },
      { status: missingTable ? 503 : 500 },
    )
  }
}
