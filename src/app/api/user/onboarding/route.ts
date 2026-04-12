export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClientFromRequest } from "@/lib/supabaseRequestClient"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClientFromRequest(request)
    
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Since onboarding fields were removed, just return success
    // This endpoint can be used for future onboarding logic if needed
    return NextResponse.json({
      success: true,
      message: "Onboarding completed",
    })
  } catch (error) {
    console.error("Onboarding API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 