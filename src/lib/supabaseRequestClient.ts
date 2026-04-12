import { createServerClient } from "@supabase/ssr"
import type { NextRequest } from "next/server"
import { getSupabasePublicEnv } from "@/lib/supabaseEnv"

export function createSupabaseServerClientFromRequest(request: NextRequest) {
  const { url, anonKey } = getSupabasePublicEnv()
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll() {
        // No-op for route handlers that do not mutate auth cookies
      },
    },
  })
}
