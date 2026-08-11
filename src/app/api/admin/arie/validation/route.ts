export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import {
  createValidationBatch,
  serializeBatch,
  serializeCase,
} from "@/lib/arie/validation-batch"

/** GET — list validation batches. */
export async function GET(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const id = request.nextUrl.searchParams.get("id")
  const reviewOnly = request.nextUrl.searchParams.get("reviewOnly") === "1"

  if (id) {
    const batch = await prisma.arieValidationBatch.findUnique({
      where: { id },
      include: {
        cases: {
          where: reviewOnly ? { selectedForReview: true } : undefined,
          orderBy: [{ reviewPriority: "desc" }, { createdAt: "asc" }],
        },
        _count: { select: { cases: true } },
      },
    })
    if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 })
    return NextResponse.json({
      batch: serializeBatch(
        batch,
        batch.cases.map(serializeCase),
      ),
    })
  }

  const rows = await prisma.arieValidationBatch.findMany({
    orderBy: { createdAt: "desc" },
    take: 40,
    include: { _count: { select: { cases: true } } },
  })
  return NextResponse.json({
    batches: rows.map((b) => serializeBatch(b)),
  })
}

/** POST — create immutable batch from seed fixtures and/or uploaded JSON. */
export async function POST(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  try {
    const created = await createValidationBatch({
      name: typeof body.name === "string" ? body.name : "Validation batch",
      includeSeed: body.includeSeed !== false,
      seedVersion: typeof body.seedVersion === "string" ? body.seedVersion : undefined,
      uploaded: body.uploaded ?? body.items ?? undefined,
      runMode: body.runMode === "full_pipeline" ? "full_pipeline" : "score_only",
      sampleConfig:
        body.sampleConfig && typeof body.sampleConfig === "object"
          ? body.sampleConfig
          : undefined,
      notes: typeof body.notes === "string" ? body.notes : undefined,
      createdByEmail: admin.email ?? null,
    })
    return NextResponse.json(created)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 400 },
    )
  }
}
