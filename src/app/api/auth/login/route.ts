import { NextRequest, NextResponse } from "next/server"
import { createServerSupabase } from "@/lib/supabaseServer"

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

    const supabase = createServerSupabase()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ success: true, user: data.user })
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json(
      { error: "Failed to login" },
      { status: 500 }
    )
  }
}


