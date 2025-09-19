import { NextRequest, NextResponse } from "next/server"
import dns from "dns/promises"

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const email = searchParams.get("email") || ""
  if (!email || !email.includes("@")) {
    return NextResponse.json({ valid: false, error: "Invalid email" }, { status: 400 })
  }

  const domain = email.split("@")[1]
  try {
    const records = await dns.resolveMx(domain)
    const valid = !!(records && records.length > 0)
    return NextResponse.json({ valid })
  } catch {
    return NextResponse.json({ valid: false })
  }
}


