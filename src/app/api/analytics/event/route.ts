import { NextRequest, NextResponse } from "next/server"
import { persistProductEvent, type ProductEventBody } from "@/lib/analytics/product-event"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * First-party product event beacon.
 * Most failures / drops → 204. Per-IP hour cap → 429.
 */
export async function POST(request: NextRequest) {
  try {
    let body: ProductEventBody = {}
    try {
      body = (await request.json()) as ProductEventBody
    } catch {
      return new NextResponse(null, { status: 204 })
    }

    const result = await persistProductEvent(request, body)
    return new NextResponse(null, { status: result.status })
  } catch {
    // Swallow — analytics must never break the product
    return new NextResponse(null, { status: 204 })
  }
}
