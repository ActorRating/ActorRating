"use client"

import { useRouter } from "next/navigation"
import { useSession } from "@/components/providers/SessionProvider"
import { handleLogoutWithRedirect } from "@/lib/auth"
import { Button } from "@/components/ui/Button"

export function AuthButton() {
  const router = useRouter()
  const { user, loading } = useSession()

  if (loading) {
    return (
      <Button disabled>
        Loading...
      </Button>
    )
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">Welcome, {user.email}</span>
        <Button onClick={() => void handleLogoutWithRedirect()}>Sign Out</Button>
      </div>
    )
  }

  return (
    <Button type="button" onClick={() => router.push("/auth/signup")}>
      Sign Up
    </Button>
  )
}
