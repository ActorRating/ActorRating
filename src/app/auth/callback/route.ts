import { createServerSupabase } from "@/lib/supabaseServer"
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const supabase = createServerSupabase()
    await supabase.auth.exchangeCodeForSession(code)
  }

  // Redirect to the dashboard or another appropriate page
  return NextResponse.redirect(requestUrl.origin + '/dashboard')
}
