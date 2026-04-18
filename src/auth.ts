import NextAuth from "next-auth"
import { PrismaAdapter } from "@auth/prisma-adapter"
import Google from "next-auth/providers/google"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcrypt"
import { prisma } from "@/lib/prisma"
import { GoogleOnlyCredentialsSignin } from "@/lib/authErrors"

const googleConfigured =
  Boolean(process.env.GOOGLE_CLIENT_ID?.trim()) && Boolean(process.env.GOOGLE_CLIENT_SECRET?.trim())

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    ...(googleConfigured
      ? [
          Google({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
          }),
        ]
      : []),
    Credentials({
      id: "credentials",
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const rawEmail = credentials?.email
        const rawPassword = credentials?.password
        if (typeof rawEmail !== "string" || typeof rawPassword !== "string") {
          return null
        }
        const email = rawEmail.trim().toLowerCase()
        if (!email || !rawPassword) return null

        const user = await prisma.user.findUnique({ where: { email } })
        if (!user) return null

        const stored = user.password
        if (!stored || !stored.trim()) {
          throw new GoogleOnlyCredentialsSignin()
        }

        const looksBcrypt =
          stored.startsWith("$2a$") || stored.startsWith("$2b$") || stored.startsWith("$2y$")
        if (!looksBcrypt) return null

        const ok = await bcrypt.compare(rawPassword, stored)
        if (!ok) return null

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        }
      },
    }),
  ],
  callbacks: {
    async signIn() {
      return true
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id
        if (user.email) token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub
      }
      return session
    },
  },
})
