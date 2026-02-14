// app/api/performances/by-lookup/route.ts

import { NextRequest, NextResponse } from "next/server"
import { getPerformancesByLookup } from "@/lib/performances-by-lookup"

export const revalidate = 300

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { targets } = body

    if (!Array.isArray(targets) || targets.length === 0) {
      return NextResponse.json({ error: "Invalid targets array" }, { status: 400 })
    }

    const performances = await getPerformancesByLookup(targets)

    const response = NextResponse.json({ performances })
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600")
    return response
  } catch (error) {
    console.error("[BY-LOOKUP API] ERROR:", error)
    return NextResponse.json({ error: "Failed to fetch performances" }, { status: 500 })
  }
}
