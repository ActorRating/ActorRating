export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server"
import { createSupabaseServerClientFromRequest } from "@/lib/supabaseRequestClient"
import { prisma } from "@/lib/prisma"
// Removed NextAuth imports - using Supabase Auth

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClientFromRequest(request)
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    // Return Supabase user basic info; app data tied to user.id is fetched via other routes
    return NextResponse.json({ user: { id: user.id, email: user.email } })
  } catch (error) {
    console.error("Profile GET error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = createSupabaseServerClientFromRequest(request)
    
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error || !user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { } = body

    // Validate input
    // No editable fields in simplified profile

    return NextResponse.json({ success: true, user: { id: user.id, email: user.email } })
  } catch (error) {
    console.error("Profile PUT error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
} 