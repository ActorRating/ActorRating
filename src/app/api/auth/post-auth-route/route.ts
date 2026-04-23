import { auth } from "@/auth"
import { resolveUser } from "@/lib/auth/resolveUser"
import { NextResponse } from "next/server"

/**
 * Returns a routing decision for the post-auth client page.
 * Called after useSession() confirms the session is fully hydrated on the client,
 * so that the server-side auth() call here is guaranteed to find the cookie.
 */
export async function GET() {
  const session = await auth()
  const result = await resolveUser(session)

  if (result.status === "unauthenticated") {
    return NextResponse.json({ redirect: "/auth/signin" })
  }
  if (result.needsOnboarding) {
    return NextResponse.json({ redirect: "/onboarding" })
  }
  return NextResponse.json({ redirect: "/dashboard" })
}
