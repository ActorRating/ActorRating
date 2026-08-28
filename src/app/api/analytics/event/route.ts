import { NextRequest, NextResponse } from "next/server"
import { persistProductEvent, type ProductEventBody } from "@/lib/analytics/product-event"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/**
 * First-party product event beacon. Failures never surface to the client.
 */
export async function POST(request: NextRequest) {
  try {
    let body: ProductEventBody = {}
    try {
      body = (await request.json()) as ProductEventBody
    } catch {
      return new NextResponse(null, { status: 204 })
    }

    await persistProductEvent(request, body)
  } catch {
    // Swallow — analytics must never break the product
  }

  return new NextResponse(null, { status: 204 })
}
