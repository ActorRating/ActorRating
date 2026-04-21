import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { getServerUserId } from "@/lib/serverAuth"

export const dynamic = "force-dynamic"

export default async function PostAuthPage() {
  const userId = await getServerUserId()
  if (!userId) {
    redirect("/auth/signin")
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { username: true, onboardingCompleted: true },
  })

  if (!user?.username || !user.onboardingCompleted) {
    redirect("/onboarding")
  }

  redirect("/dashboard")
}
