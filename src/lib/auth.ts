"use client"

import { signOut } from "next-auth/react"

type AppRouter = { push: (href: string) => void }

/**
 * Handles user logout with proper session cleanup and redirect
 */
export async function handleLogout(router?: AppRouter) {
  try {
    localStorage.removeItem("pendingRating")
    await signOut({ callbackUrl: "/auth/signin", redirect: true })
  } catch (error) {
    console.error("Logout error:", error)
    if (typeof window !== "undefined") {
      window.location.href = "/auth/signin"
    } else if (router) {
      router.push("/auth/signin")
    }
  }
}

export async function handleLogoutWithRedirect() {
  try {
    localStorage.removeItem("pendingRating")
    await signOut({ callbackUrl: "/auth/signin", redirect: true })
  } catch (error) {
    console.error("Logout error:", error)
    if (typeof window !== "undefined") {
      window.location.href = "/auth/signin"
    }
  }
}
