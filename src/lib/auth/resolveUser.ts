import "server-only"
import type { Session } from "next-auth"
import { prisma } from "@/lib/prisma"
import { applyPendingSignupToUser } from "@/lib/auth/pendingSignup"

type ResolvedAuthUser = {
  id: string
  email: string | null
  name: string | null
  username: string | null
  onboardingCompleted: boolean
  termsAcceptedAt: Date | null
}

export type ResolvedUserResult =
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: ResolvedAuthUser; needsOnboarding: boolean }

function isAccountIncomplete(user: {
  username: string | null
  onboardingCompleted: boolean
  termsAcceptedAt: Date | null
}) {
  return !user.username || !user.onboardingCompleted || !user.termsAcceptedAt
}

export async function resolveUser(session: Session | null): Promise<ResolvedUserResult> {
  const sessionEmail = session?.user?.email?.toLowerCase().trim()
  if (!sessionEmail) {
    return { status: "unauthenticated" }
  }

  let user = await prisma.user.findUnique({
    where: { email: sessionEmail },
    select: {
      id: true,
      email: true,
      name: true,
      username: true,
      onboardingCompleted: true,
      termsAcceptedAt: true,
    },
  })
  if (!user) {
    return { status: "unauthenticated" }
  }

  // Safety: apply pending signup cookie if the account is still incomplete.
  if (isAccountIncomplete(user)) {
    const applied = await applyPendingSignupToUser({
      id: user.id,
      email: user.email,
    })
    if (applied) {
      user = await prisma.user.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          onboardingCompleted: true,
          termsAcceptedAt: true,
        },
      })
      if (!user) {
        return { status: "unauthenticated" }
      }
    }
  }

  return {
    status: "authenticated",
    user,
    needsOnboarding: isAccountIncomplete(user),
  }
}
