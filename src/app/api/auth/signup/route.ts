import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"
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

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })

    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ success: true, user: data.user })

  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
} 