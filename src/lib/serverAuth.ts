/**
 * Server-side auth for use in Server Components (e.g. dashboard, profile).
 * Uses cookies() from next/headers and Supabase createServerClient.
 * Do not import this from client components or pages/ — use server-only.
 */

import 'server-only'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'
import { isDevMode, getDevUser } from '@/lib/devAuth'

export type ServerUser = {
  id: string
  email?: string
  user_metadata?: { name?: string }
}

export async function getServerUser(): Promise<ServerUser | null> {
  try {
    if (isDevMode) {
      const dev = getDevUser()
      if (dev) return dev as ServerUser
    }
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll() {
            // No-op in Server Components; middleware handles cookie updates
          },
        },
      }
    )
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return null
    return user as ServerUser
  } catch {
    // Avoid leaking errors in production; invalid/malformed cookies or Supabase failures
    return null
  }
}

export async function getServerUserId(): Promise<string | null> {
  try {
    const user = await getServerUser()
    return user?.id ?? null
  } catch {
    return null
  }
}
