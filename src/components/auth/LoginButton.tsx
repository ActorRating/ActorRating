"use client"
import { useState } from "react"
import { FcGoogle } from "react-icons/fc"
import { Button } from "@/components/ui/Button"
import supabase from "@/lib/supabaseClient"
import { getAuthCallbackUrl } from "@/lib/auth"
import { BouncingBallsLoader } from "@/components/ui/BouncingBallsLoader"

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
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: getAuthCallbackUrl() }
      })
      if (error) {
        console.error("Login error:", error)
      }
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
        <BouncingBallsLoader size="sm" color="currentColor" className="mb-0" />
      ) : (
        <FcGoogle className="w-4 h-4" />
      )}
      {children || "Sign in with Google"}
    </Button>
  )
} 