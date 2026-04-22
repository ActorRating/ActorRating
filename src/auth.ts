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
    strategy: "database",
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
            allowDangerousEmailAccountLinking: true,
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
    async redirect() {
      return "https://actorrating.com/post-auth"
    },
    async signIn({ user }) {
      if (user?.email && isDisposableEmail(user.email)) {
        throw new Error("DISPOSABLE_EMAIL")
      }
      return true
    },
    async session({ session, user }) {
      if (session.user && user?.id) {
        session.user.id = user.id
      }
      return session
    },
  },
}

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions)
