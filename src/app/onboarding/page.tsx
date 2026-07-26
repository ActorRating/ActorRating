import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

/** Legacy username onboarding — replaced by /auth/finish-account. */
export default function OnboardingPage() {
  redirect("/auth/finish-account")
}
