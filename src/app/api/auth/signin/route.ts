import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcrypt"

export async function GET(request: NextRequest) {
  // Handle OAuth error redirects
  const searchParams = request.nextUrl.searchParams
  const error = searchParams.get('error')
  
  if (error) {
    // Redirect to the signin page with the error
    const signinUrl = new URL('/auth/signin', request.url)
    signinUrl.searchParams.set('error', error)
    return NextResponse.redirect(signinUrl)
  }
  
  // If no error, redirect to signin page
  return NextResponse.redirect(new URL('/auth/signin', request.url))
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { email }
    })

    if (!user || !user.password) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      )
    }

    // No email verification gating

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email }
    })

  } catch (error) {
    console.error("Signin error:", error)
    return NextResponse.json(
      { error: "Failed to sign in" },
      { status: 500 }
    )
  }
} 