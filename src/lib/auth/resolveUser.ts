import "server-only"
import type { Session } from "next-auth"
import { prisma } from "@/lib/prisma"
import type { UserStatus } from "@prisma/client"

type ResolvedAuthUser = {
  id: string
  email: string
  username: string | null
  onboardingCompleted: boolean
  status: UserStatus
  onboardingStartedAt: Date | null
}

export type ResolvedUserResult =
  | { status: "unauthenticated" }
  | { status: "needs_onboarding"; user: ResolvedAuthUser }
  | { status: "authenticated"; user: ResolvedAuthUser }

export async function resolveUser(session: Session | null): Promise<ResolvedUserResult> {
  const sessionUserId = session?.user?.id
  if (!sessionUserId) {
    return { status: "unauthenticated" }
  }

  const byId = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { id: true, email: true, username: true, onboardingCompleted: true, status: true, onboardingStartedAt: true },
  })
  if (!byId) {
    return { status: "unauthenticated" }
  }

  // ONBOARDING is a resumable state by design and should never become terminal.
  if (byId.status === "NEW" || byId.status === "ONBOARDING") {
    return { status: "needs_onboarding", user: byId }
  }
  return { status: "authenticated", user: byId }
}
