import type { NextAuthConfig } from "next-auth"

/**
 * Edge-safe NextAuth config — no Prisma, no server-only imports.
 *
 * Used by src/middleware.ts (runs on the Vercel/Coolify Edge before any page
 * is rendered) to enforce authentication purely from the JWT cookie.
 *
 * src/auth.ts spreads this config and adds the full Node.js-only pieces
 * (PrismaAdapter, providers, jwt/session callbacks).
 */

/** Routes that require a valid session. */
const PROTECTED = ["/dashboard", "/onboarding", "/post-auth"]

/** Auth-flow pages that authenticated users should be redirected away from. */
const AUTH_PAGES = ["/auth/signin", "/auth/register"]

export const authConfig = {
  pages: {
    signIn: "/auth/signin",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const path = nextUrl.pathname

      // Unauthenticated user on a protected route → send to sign-in.
      // NextAuth appends ?callbackUrl= so the user lands back here after login.
      if (PROTECTED.some((p) => path.startsWith(p)) && !isLoggedIn) {
        return false
      }

      // Authenticated user visiting sign-in / register → skip the form.
      if (AUTH_PAGES.some((p) => path.startsWith(p)) && isLoggedIn) {
        return Response.redirect(new URL("/dashboard", nextUrl))
      }

      return true
    },
  },
  providers: [],
} satisfies NextAuthConfig
