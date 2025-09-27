import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

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

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }
    return NextResponse.json({ success: true, user: data.user })

  } catch (error) {
    console.error("Signin error:", error)
    return NextResponse.json(
      { error: "Failed to sign in" },
      { status: 500 }
    )
  }
} 