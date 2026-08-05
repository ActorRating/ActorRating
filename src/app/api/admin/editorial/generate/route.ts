export const dynamic = "force-dynamic"
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { generatePerformanceEditorial } from "@/lib/editorial/generate-performance-editorial"

/**
 * POST { actorId, movieId } | { id } | { id, force: true }
 * Regenerates template draft. force required to overwrite HUMAN_LOCKED.
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = (await request.json().catch(() => null)) as null | {
      id?: string
      actorId?: string
      movieId?: string
      force?: boolean
      publish?: boolean
    }
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
    }

    let actorId = body.actorId
    let movieId = body.movieId

    if (body.id && (!actorId || !movieId)) {
      const row = await prisma.performanceEditorial.findUnique({
        where: { id: body.id },
        select: { actorId: true, movieId: true },
      })
      if (!row) {
        return NextResponse.json({ error: "Not found" }, { status: 404 })
      }
      actorId = row.actorId
      movieId = row.movieId
    }

    if (!actorId || !movieId) {
      return NextResponse.json({ error: "actorId and movieId (or id) required" }, { status: 400 })
    }

    const result = await generatePerformanceEditorial(prisma, actorId, movieId, {
      force: !!body.force,
      publish: body.publish !== false,
      editedByEmail: admin.email,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.reason }, { status: 422 })
    }

    const row = await prisma.performanceEditorial.findUnique({
      where: { id: result.id },
      include: {
        actor: { select: { id: true, name: true, slug: true } },
        movie: { select: { id: true, title: true, year: true, slug: true } },
      },
    })

    return NextResponse.json({ result, editorial: row })
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
