import { NextRequest, NextResponse } from "next/server"
import { generateVerificationToken, sendVerificationEmail } from "@/lib/emailVerification"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Always respond success to avoid account enumeration
    const token = await generateVerificationToken(email)
    await sendVerificationEmail(email, token)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: "Failed to resend verification" }, { status: 500 })
  }
}




