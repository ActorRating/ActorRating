import { redirect } from "next/navigation"
import OnboardingClient from "./OnboardingClient"
import { auth } from "@/auth"
import { resolveUser } from "@/lib/auth/resolveUser"

export const dynamic = "force-dynamic"

export default async function OnboardingPage() {
  const session = await auth()
  const result = await resolveUser(session)

  // Middleware guards /onboarding — safety valve for any slip-through.
  if (result.status !== "authenticated") {
    redirect("/auth/signin")
  }

  // User has already completed onboarding — no need to be here.
  if (!result.needsOnboarding) {
    redirect("/dashboard")
  }

  return <OnboardingClient />
}