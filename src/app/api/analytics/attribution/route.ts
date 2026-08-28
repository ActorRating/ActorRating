import { NextRequest, NextResponse } from "next/server"
import { readAttributionFromRequest } from "@/lib/tracking/attribution-cookies"

export const dynamic = "force-dynamic"
export const runtime = "nodejs"

/** Returns first-touch acquisition context for client analytics events. */
export async function GET(request: NextRequest) {
  return NextResponse.json(readAttributionFromRequest(request))
}
