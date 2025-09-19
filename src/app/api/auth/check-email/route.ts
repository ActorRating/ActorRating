import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
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

    // Check if email exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    return NextResponse.json({
      available: !existingUser,
      email
    })

  } catch (error) {
    console.error("Check email error:", error)
    return NextResponse.json(
      { error: "Failed to check email" },
      { status: 500 }
    )
  }
} 