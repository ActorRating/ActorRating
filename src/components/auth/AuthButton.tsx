"use client"

import { useUser } from "@/components/providers/SessionProvider"
import { handleLogoutWithRedirect, getAuthCallbackUrl } from "@/lib/auth"
import { Button } from "@/components/ui/Button"
import { getSupabaseClient } from "@/lib/supabaseClient"

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
      const { error } = await getSupabaseClient().auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getAuthCallbackUrl()
        }
      })
      if (error) console.error(error)
    }}>
      Sign Up
    </Button>
  )
} 