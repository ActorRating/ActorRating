import { auth } from "@/auth"
import { resolveUser } from "@/lib/auth/resolveUser"
import { NextResponse } from "next/server"

/**
 * Returns a routing decision for the post-auth client page.
 *
 * Called AFTER useSession() confirms the session is stable on the client,
 * so the cookie is guaranteed to be present in this server-side request.
 */
export async function GET(request: Request) {
  try {
    const session = await auth()

    // Full session dump — visible in Coolify container logs.
    console.log("[post-auth-route] raw session:", JSON.stringify({
      hasSession: !!session,
      email: session?.user?.email ?? null,
      name: session?.user?.name ?? null,
      expires: session?.expires ?? null,
      cookieHeader: request.headers.get("cookie")
        ? `present (${request.headers.get("cookie")!.length} chars)`
        : "MISSING",
    }))

    if (!session?.user?.email) {
      console.warn("[post-auth-route] ✗ no session/email — sending to signin")
      return NextResponse.json({ redirect: "/auth/signin" })
    }

    const result = await resolveUser(session)

    if (result.status === "unauthenticated") {
      console.warn("[post-auth-route] ✗ resolveUser=unauthenticated for", session.user.email)
      return NextResponse.json({ redirect: "/auth/signin" })
    }

    const dest = result.needsOnboarding ? "/onboarding" : "/dashboard"
    console.log("[post-auth-route] ✓", session.user.email, "→", dest)
    return NextResponse.json({ redirect: dest })
  } catch (err) {
    console.error("[post-auth-route] error:", err)
    return NextResponse.json({ redirect: "/auth/signin" }, { status: 500 })
  }
}
