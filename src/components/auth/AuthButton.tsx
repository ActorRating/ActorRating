"use client"

import { signIn, signOut, useSession } from "next-auth/react"
import { Button } from "@/components/ui/Button"

export function AuthButton() {
  const { data: session, status } = useSession()

  if (status === "loading") {
    return (
      <Button disabled>
        Loading...
      </Button>
    )
  }

  if (session) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">Welcome, {session.user.email}</span>
        <Button onClick={() => signOut({ callbackUrl: "/" })}>
          Sign Out
        </Button>
      </div>
    )
  }

  return (
    <Button onClick={() => signIn()}>
      Sign In
    </Button>
  )
} 