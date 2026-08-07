export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { arieServiceKey } from "@/lib/arie/config"
import { ingestInboundEvent } from "@/lib/arie/ingest"

function authorized(request: NextRequest): boolean {
  const expected = arieServiceKey()
  if (!expected) return false
  const header = request.headers.get("authorization") ?? ""
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : ""
  const alt = request.headers.get("x-arie-key")?.trim() ?? ""
  return bearer === expected || alt === expected
}

/**
 * POST /api/arie/ingest
 * Ingest + Sprint 2 pipeline (entity → score → context package).
 */
export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as null | {
    platform?: "X"
    externalId?: string
    authorHandle?: string
    authorId?: string
    text?: string
    payload?: Record<string, unknown>
    process?: boolean
  }

  if (!body?.externalId || !body?.text) {
    return NextResponse.json({ error: "externalId and text required" }, { status: 400 })
  }

  const result = await ingestInboundEvent({
    platform: body.platform ?? "X",
    externalId: body.externalId,
    authorHandle: body.authorHandle,
    authorId: body.authorId,
    text: body.text,
    payload: body.payload,
    process: body.process,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 422 })
  }

  const refreshed = await prisma.arieInboundEvent.findUnique({
    where: { id: result.event.id },
  })

  return NextResponse.json({
    id: result.event.id,
    decision: refreshed?.decision ?? result.event.decision,
    opportunityScore: refreshed?.opportunityScore ?? result.processed?.opportunityScore ?? null,
    opportunityId: result.processed?.opportunityId ?? null,
    deduped: result.deduped,
    processed: result.processed
      ? {
          ok: result.processed.ok,
          decision: result.processed.decision,
          opportunityScore: result.processed.opportunityScore,
          opportunityId: result.processed.opportunityId,
        }
      : null,
  })
}
