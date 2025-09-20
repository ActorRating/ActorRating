import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { generateVerificationToken, sendVerificationEmail } from "@/lib/emailVerification"

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    // Always respond success to avoid account enumeration
    if (!user) {
      return NextResponse.json({ success: true })
    }

    const token = await generateVerificationToken(user.id)
    await sendVerificationEmail(email, token)
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: "Failed to resend verification" }, { status: 500 })
  }
}




