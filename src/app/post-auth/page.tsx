import { redirect } from "next/navigation"
import { unstable_noStore as noStore } from "next/cache"
import { auth } from "@/auth"
import { resolveUser } from "@/lib/auth/resolveUser"

export const dynamic = "force-dynamic"

export default async function PostAuthPage() {
  noStore()
  const session = await auth()
  const result = await resolveUser(session)

  if (result.status === "unauthenticated") {
    redirect("/auth/signin")
  }
  if (result.needsOnboarding) {
    redirect("/onboarding")
  }

  redirect("/dashboard")
}
