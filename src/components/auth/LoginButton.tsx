"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { FcGoogle } from "react-icons/fc"
import { Button } from "@/components/ui/Button"

interface LoginButtonProps {
  className?: string
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  children?: React.ReactNode
  onClick?: () => void
  disabled?: boolean
}

export function LoginButton({ 
  className, 
  variant = "default", 
  size = "md",
  children,
  onClick,
  disabled = false
}: LoginButtonProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleLogin = async () => {
    if (onClick) {
      onClick()
      return
    }

    setIsLoading(true)
    try {
      await signIn("google", { callbackUrl: "/onboarding" })
    } catch (error) {
      console.error("Login error:", error)
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleGoogleLogin}
      disabled={disabled || isLoading}
      variant={variant}
      size={size}
      className={`flex items-center gap-2 ${className || ""}`}
    >
      {isLoading ? (
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <FcGoogle className="w-4 h-4" />
      )}
      {children || "Sign in with Google"}
    </Button>
  )
} 