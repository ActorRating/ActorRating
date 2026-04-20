import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import EmailProvider from "next-auth/providers/email"
import GoogleProvider from "next-auth/providers/google"
import { prisma } from "@/lib/prisma"
import { sendMagicLinkEmail } from "@/lib/magicLinkEmail"
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,
  },
  cookies: {
    sessionToken: {
      name: isProduction ? "__Secure-authjs.session-token" : "authjs.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProduction,
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
        await sendMagicLinkEmail(params)
      },
    }),
  ],
  callbacks: {
    async redirect({ url, baseUrl }) {
      // Must allow same-origin / relative URLs so email/OAuth callbacks complete.
      // Only fall back to dashboard for unknown external URLs.
      if (url.startsWith("/")) {
        return `${baseUrl}${url}`
      }
      try {
        const target = new URL(url)
        if (target.origin === baseUrl) {
          return url
        }
      } catch {
        // ignore invalid url
      }
      return `${baseUrl}/dashboard`
    },
    async session({ session, user }) {
      if (session.user && user?.id) {
        session.user.id = user.id
      }
      return session
    },
  },
})
