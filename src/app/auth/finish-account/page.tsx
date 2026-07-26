import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { resolveUser } from "@/lib/auth/resolveUser"
import FinishAccountClient from "./FinishAccountClient"

export const dynamic = "force-dynamic"

export default async function FinishAccountPage() {
  const session = await auth()
  const result = await resolveUser(session)

  if (result.status !== "authenticated") {
    redirect("/auth/signin")
  }

  if (!result.needsOnboarding) {
    redirect("/dashboard")
  }

  return (
    <FinishAccountClient
      initialUsername={result.user.username ?? ""}
      email={result.user.email ?? ""}
    />
  )
}
