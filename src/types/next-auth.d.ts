import type { DefaultSession } from "next-auth"
import type { UserStatus } from "@prisma/client"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      status?: UserStatus
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string
    authProvider?: string
    authProviderAccountId?: string
    userStatus?: UserStatus
  }
}
