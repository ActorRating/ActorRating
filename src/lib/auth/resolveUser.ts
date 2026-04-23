import "server-only"
import type { Session } from "next-auth"
import { prisma } from "@/lib/prisma"
import type { UserStatus } from "@prisma/client"

type ResolvedAuthUser = {
  id: string
  email: string | null
  name?: string
  username: string | null
  onboardingCompleted: boolean
  status: UserStatus
  onboardingStartedAt: Date | null
}

export type ResolvedUserResult =
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: ResolvedAuthUser; needsOnboarding: boolean }

export async function resolveUser(session: Session | null): Promise<ResolvedUserResult> {
  console.log("SESSION:", session)
  const sessionUserId = session?.user?.id
  if (!sessionUserId) {
    return { status: "unauthenticated" }
  }

  const byId = await prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { id: true, email: true, name: true, username: true, onboardingCompleted: true, status: true, onboardingStartedAt: true },
  })
  if (!byId) {
    const fallbackUser: ResolvedAuthUser = {
      id: sessionUserId,
      email: session?.user?.email ?? null,
      name: session?.user?.name ?? "User",
      username: null,
      onboardingCompleted: false,
      status: "ONBOARDING",
      onboardingStartedAt: null,
    }
    console.log("RESOLVED USER:", fallbackUser)
    return {
      status: "authenticated",
      user: fallbackUser,
      needsOnboarding: true,
    }
  }

  console.log("RESOLVED USER:", byId)
  return {
    status: "authenticated",
    user: byId,
    needsOnboarding: !byId.onboardingCompleted,
  }
}
