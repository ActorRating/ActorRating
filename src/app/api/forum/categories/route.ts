export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/** Public list of forum categories with recent activity counts. */
export async function GET() {
  try {
    const categories = await prisma.forumCategory.findMany({
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        sortOrder: true,
        _count: { select: { threads: true } },
      },
    })

    return NextResponse.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description,
        sortOrder: c.sortOrder,
        threadCount: c._count.threads,
      })),
    })
  } catch (error) {
    console.error("Forum categories error:", error)
    return NextResponse.json({ error: "Failed to load categories" }, { status: 500 })
  }
}
