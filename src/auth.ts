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

if (isProduction && (!resolvedEmailServer || !resolvedEmailFrom)) {
  throw new Error(
    "Magic link auth requires AUTH_EMAIL_SERVER/EMAIL_SERVER and AUTH_EMAIL_FROM/EMAIL_FROM in production.",
  )
}

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
            allowDangerousEmailAccountLinking: false,
          }),
        ]
      : []),
    EmailProvider({
      from: resolvedEmailFrom!,
      server: resolvedEmailServer!,
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
  ],
  callbacks: {
    async redirect({ url }) {
      const canonical = "https://actorrating.com"
      const isRelative = url.startsWith("/")
      const isCanonicalAbsolute = url.startsWith(canonical)
      if (authDebug && !isRelative && !isCanonicalAbsolute) {
        console.warn("[auth][redirect] blocked non-canonical callbackUrl:", url)
      }
      return `${canonical}/post-auth`
    },
    async signIn({ user, account, profile }) {
      if (user?.email && isDisposableEmail(user.email)) {
        throw new Error("DISPOSABLE_EMAIL")
      }

      const provider = account?.provider
      const providerAccountId = account?.providerAccountId
      if (!provider || !providerAccountId) return true

      const linkedAccount = await prisma.account.findUnique({
        where: { provider_providerAccountId: { provider, providerAccountId } },
        select: { userId: true },
      })
      if (linkedAccount) {
        if (authDebug) {
          console.log("[auth][signIn] linked account hit", { provider, providerAccountId, userId: linkedAccount.userId })
        }
        return true
      }

      // Prevent implicit cross-provider linking by email unless account already linked.
      const email = user?.email?.toLowerCase().trim()
      if (email) {
        const emailOwner = await prisma.user.findUnique({
          where: { email },
          select: { id: true, accounts: { select: { provider: true } } },
        })
        if (!emailOwner) {
          return true
        }
        if (emailOwner.accounts.some((a) => a.provider === provider)) {
          return true
        }
        if (authDebug) {
          console.warn("[auth][signIn] provider mismatch for:", email)
        }
        return true
      }

      if (authDebug) {
        console.log("[auth][signIn] success", { provider, email: user?.email, hasProfile: !!profile })
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user?.id) {
        token.userId = user.id
        token.name = user.name ?? "User"
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { status: true },
        })
        if (dbUser?.status) {
          token.userStatus = dbUser.status
        }
      }
      if (account?.provider && account?.providerAccountId) {
        if (
          token.userId &&
          user?.id &&
          token.userId !== user.id &&
          token.authProvider &&
          token.authProviderAccountId
        ) {
          if (authDebug) {
            console.warn("[auth][jwt] identity switch detected, resetting token identity")
          }
          token.userId = user.id
        }
        token.authProvider = account.provider
        token.authProviderAccountId = account.providerAccountId
      }
      if (authDebug) {
        console.log("[auth][jwt] token issued", {
          sub: token.sub,
          userId: token.userId,
          provider: token.authProvider,
          providerAccountId: token.authProviderAccountId,
        })
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.userId as string) || session.user.id
        session.user.name = session.user.name ?? (token.name as string) ?? "User"
        session.user.status = token.userStatus as "NEW" | "ONBOARDING" | "ACTIVE" | undefined
      }
      if (authDebug) {
        console.log("[auth][session] session materialized", {
          userId: session.user?.id,
          provider: token.authProvider,
          providerAccountId: token.authProviderAccountId,
        })
      }
      return session
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)
