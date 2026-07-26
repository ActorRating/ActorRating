import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

/** Legacy forced first-rating step — users go straight to the dashboard now. */
export default function OnboardingRatePage() {
  redirect("/dashboard")
}
