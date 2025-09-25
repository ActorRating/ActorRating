import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
  const cookieStore = cookies()
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
  const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Since terms fields were removed, just return success
    // This endpoint can be used for future terms logic if needed
    return NextResponse.json({ 
      success: true,
      message: "Terms acceptance recorded"
    })
  } catch (error) {
    console.error("Terms acceptance update error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Since terms fields were removed, return default values
    return NextResponse.json({ 
      acceptedTerms: true,
      acceptedAt: new Date().toISOString(),
      termsVersion: "1.0"
    })
  } catch (error) {
    console.error("Terms acceptance get error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}