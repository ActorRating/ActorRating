import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import EmailProvider from "next-auth/providers/email"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import { sendMagicLinkEmail } from "@/lib/magicLinkEmail"
import { getRequestIp, isDisposableEmail, validateMagicLinkRequest } from "@/lib/authGuards"
import type { SMTPTransport } from "nodemailer/lib/smtp-transport"

const emailFrom = process.env.AUTH_EMAIL_FROM || process.env.EMAIL_FROM
const emailServer = process.env.AUTH_EMAIL_SERVER || process.env.EMAIL_SERVER
const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim()
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim()
const isProduction = process.env.NODE_ENV === "production"
const authDebug = !isProduction

const fallbackDevServer: SMTPTransport.Options = { jsonTransport: true }
const resolvedEmailServer = emailServer || (!isProduction ? fallbackDevServer : undefined)
const resolvedEmailFrom = emailFrom || (!isProduction ? "ActorRating Dev <dev@localhost>" : undefined)

function validateAuthEnv(): {
  emailServer?: string | SMTPTransport.Options
  emailFrom?: string
} {
  // Build-safe: never throw at import time; only validate when provider is used.
  if (!resolvedEmailServer || !resolvedEmailFrom) {
    return {}
  }
  return {
    emailServer: resolvedEmailServer,
    emailFrom: resolvedEmailFrom,
  }
}
const runtimeAuthEnv = validateAuthEnv()

export const authOptions: NextAuthConfig = {
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: "__Secure-next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: true,
      },
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    ...(googleClientId && googleClientSecret
      ? [
          GoogleProvider({
            clientId: googleClientId,
            clientSecret: googleClientSecret,
            // Required for OAuth when a User with the same email already exists (e.g. magic link first).
            // signIn does not throw on provider differences; the adapter must be allowed to attach the OAuth account.
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    ...(runtimeAuthEnv.emailServer && runtimeAuthEnv.emailFrom
      ? [
          EmailProvider({
            from: runtimeAuthEnv.emailFrom!,
            server: runtimeAuthEnv.emailServer!,
            maxAge: 15 * 60,
            async sendVerificationRequest(params) {
              const email = params.identifier.trim().toLowerCase()
              const ip = getRequestIp(params.request)
              const guard = validateMagicLinkRequest({ email, ip })
              if (!guard.allowed) {
                throw new Error(guard.code)
              }
              await sendMagicLinkEmail(params)
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Use baseUrl (derived from NEXTAUTH_URL) so local dev stays on localhost
      // and production stays on actorrating.com — never cross-domain.
      const base = baseUrl.replace(/\/$/, "")
      const canonical = "https://actorrating.com"
      if (authDebug && !url.startsWith("/") && !url.startsWith(base) && !url.startsWith(canonical)) {
        console.warn("[auth][redirect] non-base callbackUrl:", url)
      }
      return `${base}/post-auth`
    },
    async signIn({ user, account, profile }) {
      // Policy-only rejection (never use provider mismatch to block; that breaks OAuth callback + session cookie).
      if (user?.email && isDisposableEmail(user.email)) {
        throw new Error("DISPOSABLE_EMAIL")
      }

      const provider = account?.provider
      const providerAccountId = account?.providerAccountId
      const email = user?.email?.toLowerCase().trim() ?? null

      if (!provider || !providerAccountId) {
        if (authDebug) {
          console.log("[auth][signIn] allow: no provider account yet", { provider, email, hasProfile: !!profile })
        }
        return true
      }

      const linkedAccount = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        select: { userId: true },
      })
      if (linkedAccount) {
        if (authDebug) {
          console.log("[auth][signIn] allow: account already linked", {
            provider,
            providerAccountId,
            userId: linkedAccount.userId,
            email,
          })
        }
        return true
      }

      if (email) {
        const emailOwner = await prisma.user.findUnique({
          where: { email },
          select: { id: true, accounts: { select: { provider: true, providerAccountId: true } } },
        })
        if (emailOwner) {
          const hasSameProvider = emailOwner.accounts.some((a) => a.provider === provider)
          if (authDebug) {
            console.warn("[auth][signIn] user exists for email — allowing (no block)", {
              email,
              provider,
              userId: emailOwner.id,
              hasSameProvider,
              existingAccounts: emailOwner.accounts,
            })
          } else {
            console.warn("[auth][signIn] user exists; allowing", { provider, userId: emailOwner.id, hasSameProvider })
          }
        } else if (authDebug) {
          console.log("[auth][signIn] no user for email; new sign-up path", { email, provider })
        }
      } else if (authDebug) {
        console.log("[auth][signIn] no email on user; allow", { provider, providerAccountId, hasProfile: !!profile })
      }

      if (authDebug) {
        console.log("[auth][signIn] allow", { provider, email, hasProfile: !!profile })
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user?.email) {
        token.email = user.email.toLowerCase().trim()
      }
      if (user?.name) {
        token.name = user.name
      }
      if (account?.provider && account?.providerAccountId) {
        token.authProvider = account.provider
        token.authProviderAccountId = account.providerAccountId
      }
      if (authDebug) {
        console.log("[auth][jwt] token issued", {
          sub: token.sub,
          email: token.email,
          provider: token.authProvider,
          providerAccountId: token.authProviderAccountId,
        })
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = (token.email as string) || session.user.email || null
        session.user.name = session.user.name ?? (token.name as string) ?? "User"
      }
      if (authDebug) {
        console.log("[auth][session] session materialized", {
          email: session.user?.email,
          provider: token.authProvider,
          providerAccountId: token.authProviderAccountId,
        })
      }
      return session
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)
