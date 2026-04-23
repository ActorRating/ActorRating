import { auth } from "@/auth"
import { resolveUser } from "@/lib/auth/resolveUser"
import { NextResponse } from "next/server"

/**
 * Returns a routing decision for the post-auth client page.
 *
 * Called AFTER useSession() confirms the session is stable on the client,
 * so the cookie is guaranteed to be present in this server-side request.
 */
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      console.warn("[post-auth-route] no session or email — returning signin")
      return NextResponse.json({ redirect: "/auth/signin" })
    }

    const result = await resolveUser(session)

    if (result.status === "unauthenticated") {
      console.warn("[post-auth-route] resolveUser=unauthenticated for", session.user.email)
      return NextResponse.json({ redirect: "/auth/signin" })
    }

    const dest = result.needsOnboarding ? "/onboarding" : "/dashboard"
    console.log("[post-auth-route]", session.user.email, "→", dest)
    return NextResponse.json({ redirect: dest })
  } catch (err) {
    console.error("[post-auth-route] error:", err)
    return NextResponse.json({ redirect: "/auth/signin" }, { status: 500 })
  }
}
