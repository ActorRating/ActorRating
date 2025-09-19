import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import * as bcrypt from "bcrypt"
import { validateSignUpData } from "@/lib/validation"
import { checkRateLimit } from "@/lib/rateLimit"
import dns from "dns/promises"

async function isValidEmailDomain(email: string): Promise<boolean> {
  const domain = email.split("@")[1]
  try {
    const records = await dns.resolveMx(domain)
    return !!(records && records.length > 0)
  } catch {
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIp = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'

    // Check rate limiting for signup attempts
    const rateLimitResult = await checkRateLimit(clientIp, 'signup')
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          error: "Too many signup attempts. Please try again later.",
          resetTime: rateLimitResult.resetTime
        },
        { status: 429 }
      )
    }

    const body = await request.json()
    const { email, password } = body

    // Validate input data
    const validation = validateSignUpData({ email, password })
    if (!validation.isValid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      )
    }

    // MX record check for email domain
    const domainOk = await isValidEmailDomain(email)
    if (!domainOk) {
      return NextResponse.json(
        { error: "Invalid email domain" },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingEmail = await prisma.user.findUnique({
      where: { email }
    })

    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        updatedAt: new Date(),
      },
      select: { id: true, email: true }
    })

    return NextResponse.json({ success: true, user })

  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
} 