export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { arieServiceKey } from "@/lib/arie/config"
import { buildContextFromText } from "@/lib/arie/pipeline"
import { processInboundEvent } from "@/lib/arie/pipeline"
import { prisma } from "@/lib/prisma"

function authorized(request: NextRequest): boolean {
  const expected = arieServiceKey()
  if (!expected) return false
  const header = request.headers.get("authorization") ?? ""
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : ""
  const alt = request.headers.get("x-arie-key")?.trim() ?? ""
  return bearer === expected || alt === expected
}

/**
 * POST /api/arie/context
 * Body: { text, authorHandle? } | { eventId } | { opportunityId }
 * Returns a complete Context Package. Agents must not fetch DB themselves.
 */
export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json().catch(() => null)) as null | {
    text?: string
    authorHandle?: string
    eventId?: string
    opportunityId?: string
    reprocess?: boolean
  }

  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  }

  try {
    if (body.opportunityId) {
      const row = await prisma.arieContextPackage.findUnique({
        where: { opportunityId: body.opportunityId },
      })
      if (!row) {
        return NextResponse.json({ error: "Context package not found" }, { status: 404 })
      }
      return NextResponse.json({ package: row.package, id: row.id, cached: true })
    }

    if (body.eventId) {
      if (body.reprocess) {
        const processed = await processInboundEvent(body.eventId)
        if (!processed.ok) {
          return NextResponse.json({ error: processed.reason }, { status: 422 })
        }
        return NextResponse.json({
          package: processed.context,
          opportunityId: processed.opportunityId,
          opportunityScore: processed.opportunityScore,
          decision: processed.decision,
        })
      }
      const row = await prisma.arieContextPackage.findFirst({
        where: { inboundEventId: body.eventId },
        orderBy: { createdAt: "desc" },
      })
      if (row) {
        return NextResponse.json({ package: row.package, id: row.id, cached: true })
      }
      const processed = await processInboundEvent(body.eventId)
      if (!processed.ok) {
        return NextResponse.json({ error: processed.reason }, { status: 422 })
      }
      return NextResponse.json({
        package: processed.context,
        opportunityId: processed.opportunityId,
        opportunityScore: processed.opportunityScore,
        decision: processed.decision,
      })
    }

    if (!body.text?.trim()) {
      return NextResponse.json({ error: "text or eventId required" }, { status: 400 })
    }

    const pkg = await buildContextFromText({
      text: body.text,
      authorHandle: body.authorHandle,
    })
    return NextResponse.json({ package: pkg })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
