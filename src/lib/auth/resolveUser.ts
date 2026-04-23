import "server-only"
import type { Session } from "next-auth"
import { prisma } from "@/lib/prisma"

type ResolvedAuthUser = {
  id: string
  email: string | null
  name?: string
  username: string | null
  onboardingCompleted: boolean
}

export type ResolvedUserResult =
  | { status: "unauthenticated" }
  | { status: "authenticated"; user: ResolvedAuthUser; needsOnboarding: boolean }

export async function resolveUser(session: Session | null): Promise<ResolvedUserResult> {
  const sessionEmail = session?.user?.email?.toLowerCase().trim()
  if (!sessionEmail) {
    return { status: "unauthenticated" }
  }

  const user = await prisma.user.findUnique({
    where: { email: sessionEmail },
    select: { id: true, email: true, name: true, username: true, onboardingCompleted: true },
  })
  if (!user) {
    return { status: "unauthenticated" }
  }

  return {
    status: "authenticated",
    user,
    needsOnboarding: !user.onboardingCompleted,
  }
}
