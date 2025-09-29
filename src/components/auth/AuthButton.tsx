"use client"

import { useUser } from "@/components/providers/SessionProvider"
import { handleLogoutWithRedirect } from "@/lib/auth"
import { Button } from "@/components/ui/Button"

export function AuthButton() {
  const user = useUser()
  const isLoading = !user && user !== null

  if (isLoading) {
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
        <Button onClick={handleLogoutWithRedirect}>
          Sign Out
        </Button>
      </div>
    )
  }

  return (
    <Button onClick={async () => {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${process.env.NEXT_PUBLIC_BASE_URL}/auth/callback`
        }
      })
      if (error) console.error(error)
    }}>
      Sign In
    </Button>
  )
} 