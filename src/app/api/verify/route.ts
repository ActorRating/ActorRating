import { NextRequest, NextResponse } from "next/server"
import { verifyEmailToken } from "@/lib/emailVerification"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      )
    }

    const result = await verifyEmailToken(token)
    if (!result.success) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 400 }
      )
    }

    const base = process.env.APP_URL || process.env.NEXTAUTH_URL || ""
    return NextResponse.redirect(`${base}/login?verified=true`)
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 400 }
    )
  }
}




