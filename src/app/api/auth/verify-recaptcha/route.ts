import { NextRequest, NextResponse } from "next/server"
import { verifyRecaptchaV3 } from "@/lib/recaptcha"

export async function POST(request: NextRequest) {
  try {
    const { token, action } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: "reCAPTCHA token is required" },
        { status: 400 }
      )
    }

    if (!action) {
      return NextResponse.json(
        { error: "reCAPTCHA action is required" },
        { status: 400 }
      )
    }

    // Use the centralized verification function
    const result = await verifyRecaptchaV3(token, action, 0.5)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "reCAPTCHA verification failed" },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("reCAPTCHA verification error:", error)
    return NextResponse.json(
      { error: "Failed to verify reCAPTCHA" },
      { status: 500 }
    )
  }
} 