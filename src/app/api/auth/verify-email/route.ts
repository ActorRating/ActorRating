import { NextRequest, NextResponse } from "next/server"
import { verifyEmailToken } from "@/lib/emailVerification"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      )
    }

    const result = await verifyEmailToken(token)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    // Redirect to login with verified flag
    const base = process.env.APP_URL || process.env.NEXTAUTH_URL || ""
    return NextResponse.redirect(`${base}/login?verified=true`)
  } catch (error) {
    console.error("Email verification error:", error)
    return NextResponse.json(
      { error: "Failed to verify email" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is required" },
        { status: 400 }
      )
    }

    const result = await verifyEmailToken(token)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Email verification error:", error)
    return NextResponse.json(
      { error: "Failed to verify email" },
      { status: 500 }
    )
  }
} 

// Resend verification email (GET for simple link; could be POST with body)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }
    const user = await (await import("@/lib/prisma")).prisma.user.findUnique({ where: { email } })
    if (!user) {
      // Do not reveal existence
      return NextResponse.json({ success: true })
    }
    if (user.emailVerified) {
      return NextResponse.json({ success: true })
    }
    const { generateVerificationToken, sendVerificationEmail } = await import("@/lib/emailVerification")
    const token = await generateVerificationToken(user.id)
    await sendVerificationEmail(email, token)
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Failed to resend verification" }, { status: 500 })
  }
}