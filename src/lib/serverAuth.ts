/**
 * Server-side auth for Server Components (e.g. dashboard, profile).
 * Do not import from client components.
 */

import "server-only"
import { auth } from "@/auth"
import { getDevUser, isDevMode } from "@/lib/devAuth"

export type ServerUser = {
  id: string
  email?: string | null
  name?: string | null
}

export async function getServerUser(): Promise<ServerUser | null> {
  try {
    if (isDevMode) {
      const dev = getDevUser()
      if (dev) {
        return {
          id: dev.id,
          email: dev.email,
          name: dev.user_metadata?.name ?? null,
        }
      }
    }
    const session = await auth()
    const u = session?.user
    // Use email (not id) as the existence check — email is explicitly written to
    // the JWT token in the jwt callback, making it the reliable identity field.
    // session.user.id comes from token.sub which is now also explicitly set, but
    // email remains the canonical source of truth throughout this codebase.
    if (!u?.email) return null
    return {
      id: u.id ?? '',
      email: u.email,
      name: u.name,
    }
  } catch {
    return null
  }
}

export async function getServerUserId(): Promise<string | null> {
  const user = await getServerUser()
  return user?.id ?? null
}
