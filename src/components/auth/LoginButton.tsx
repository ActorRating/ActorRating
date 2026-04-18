"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/Button"
import { LogIn } from "lucide-react"

interface LoginButtonProps {
  className?: string
  variant?: "default" | "outline" | "ghost"
  size?: "sm" | "md" | "lg"
  children?: React.ReactNode
}

export function LoginButton({
  className,
  variant = "default",
  size = "md",
  children,
}: LoginButtonProps) {
  const router = useRouter()
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={`flex items-center gap-2 ${className || ""}`}
      onClick={() => router.push("/auth/signin")}
    >
      <LogIn className="w-4 h-4" />
      {children || "Sign in"}
    </Button>
  )
}
