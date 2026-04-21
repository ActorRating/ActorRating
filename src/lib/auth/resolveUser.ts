import "server-only"
import { cache } from "react"
import type { Session } from "next-auth"
import { prisma } from "@/lib/prisma"

type ResolvedAuthUser = {
  id: string
  email: string
  username: string | null
  onboardingCompleted: boolean
}

export type ResolvedUserResult =
  | { status: "unauthenticated" }
  | { status: "no_user"; session: Session }
  | { status: "needs_onboarding"; user: ResolvedAuthUser }
  | { status: "authenticated"; user: ResolvedAuthUser }

const resolveUserByEmail = cache(async (email: string): Promise<ResolvedUserResult> => {
  const user = await prisma.$queryRaw<Array<ResolvedAuthUser>>`
    SELECT id, email, "username", "onboardingCompleted"
    FROM "User"
    WHERE email = ${email}
    LIMIT 1
  `

  const resolved = user[0]
  if (!resolved) {
    return { status: "no_user", session: { user: { email } } as Session }
  }

  if (!resolved.username || !resolved.onboardingCompleted) {
    return { status: "needs_onboarding", user: resolved }
  }

  return { status: "authenticated", user: resolved }
})

export async function resolveUser(session: Session | null): Promise<ResolvedUserResult> {
  const email = session?.user?.email
  if (!email) {
    return { status: "unauthenticated" }
  }

  const result = await resolveUserByEmail(email)
  if (result.status === "no_user") {
    return { status: "no_user", session }
  }
  return result
}
