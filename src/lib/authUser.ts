import { auth } from "@/auth"
import { getDevUser, isDevMode } from "@/lib/devAuth"

/**
 * Authenticated user id for App Router route handlers and server code.
 * In local dev with NEXT_PUBLIC_DEV_MODE=true, returns the fixed dev user id.
 */
export async function getAuthenticatedUserId(): Promise<string | null> {
  if (isDevMode) {
    return getDevUser()?.id ?? null
  }
  const session = await auth()
  return session?.user?.id ?? null
}
