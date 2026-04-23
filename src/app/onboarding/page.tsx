import { redirect } from "next/navigation"
import OnboardingClient from "./OnboardingClient"
import { auth } from "@/auth"
import { resolveUser } from "@/lib/auth/resolveUser"

export const dynamic = "force-dynamic"

export default async function OnboardingPage() {
  const session = await auth()
  const result = await resolveUser(session)

  if (result.status === "unauthenticated") {
    redirect("/auth/signin")
  }

  if (result.status === "authenticated" && !result.needsOnboarding) {
    redirect("/dashboard")
  }

  return <OnboardingClient />
}