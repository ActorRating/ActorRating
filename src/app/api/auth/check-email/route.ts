import { NextRequest, NextResponse } from "next/server"
// No DB lookups to avoid account enumeration
import { validateEmail } from "@/lib/validation"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    // Validate email format
    const validation = validateEmail(email)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error, available: false },
        { status: 200 }
      )
    }

    // Do not reveal existence; validate only format, always say available
    return NextResponse.json({ available: true, email })

  } catch (error) {
    console.error("Check email error:", error)
    return NextResponse.json(
      { error: "Failed to check email" },
      { status: 500 }
    )
  }
} 