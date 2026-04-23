import { redirect } from "next/navigation"

// Always re-render; never serve a cached redirect.
export const dynamic = "force-dynamic"

/**
 * OAuth / magic-link landing page.
 *
 * This page intentionally contains ZERO authentication logic.
 *
 * After a successful sign-in NextAuth redirects the browser here.  By that
 * point the session cookie has already been set in the HTTP response from
 * /api/auth/callback/* — it is present in every subsequent server request.
 *
 * All routing decisions (unauthenticated → signin, needsOnboarding → /onboarding,
 * no ratings → /onboarding/rate, else → render) live in the /dashboard server
 * component which calls auth() + resolveUser() on the server where the cookie
 * is always available.
 *
 * Why a plain server redirect?
 *   - No JavaScript required → no hydration race condition possible
 *   - No useSession() / useEffect timing → no signin ↔ post-auth loop
 *   - auth() in /dashboard reads the real cookie directly → always correct
 */
export default function PostAuthPage() {
  redirect("/dashboard")
}
