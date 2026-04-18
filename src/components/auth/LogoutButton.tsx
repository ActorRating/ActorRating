"use client"

import { useState } from "react"
import { signOut } from "next-auth/react"
import { Button } from "@/components/ui/Button"
import { LogOut } from "lucide-react"
import { BouncingBallsLoader } from "@/components/ui/BouncingBallsLoader"

interface LogoutButtonProps {
  variant?: "default" | "outline" | "ghost" | "destructive"
  size?: "sm" | "md" | "lg"
  className?: string
  children?: React.ReactNode
  showIcon?: boolean
}

export function LogoutButton({
  variant = "outline",
  size = "md",
  className = "",
  children = "Sign Out",
  showIcon = true,
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleLogoutClick = async () => {
    if (isLoading) return

    setIsLoading(true)
    try {
      localStorage.removeItem("pendingRating")
      await signOut({ callbackUrl: "/", redirect: true })
    } catch (error) {
      console.error("Logout error:", error)
      window.location.href = "/"
    } finally {
      setIsLoading(false)
    }
  }

  const buttonVariant = variant === "destructive" ? "outline" : variant
  return (
    <Button
      onClick={handleLogoutClick}
      disabled={isLoading}
      variant={buttonVariant}
      size={size}
      className={`flex items-center gap-2 ${className}`}
    >
      {isLoading ? (
        <BouncingBallsLoader size="sm" color="currentColor" className="mb-0" />
      ) : showIcon ? (
        <LogOut className="w-4 h-4" />
      ) : null}
      {children}
    </Button>
  )
}
