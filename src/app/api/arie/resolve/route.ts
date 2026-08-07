export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { arieServiceKey } from "@/lib/arie/config"
import { extractEntitiesFromText } from "@/lib/arie/entity-extract"

function authorized(request: NextRequest): boolean {
  const expected = arieServiceKey()
  if (!expected) return false
  const header = request.headers.get("authorization") ?? ""
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : ""
  const alt = request.headers.get("x-arie-key")?.trim() ?? ""
  return bearer === expected || alt === expected
}

/** GET /api/arie/resolve?q=... — deterministic entity extraction preview. */
export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 3) {
    return NextResponse.json({ error: "q required (min 3 chars)" }, { status: 400 })
  }
  const entities = await extractEntitiesFromText(prisma, q)
  return NextResponse.json({ query: q, entities })
}
