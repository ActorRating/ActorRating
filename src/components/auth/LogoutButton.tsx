"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { LogOut, Loader2 } from 'lucide-react'
import { handleLogout } from '@/lib/auth'

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
  showIcon = true
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleLogoutClick = async () => {
    if (isLoading) return
    
    setIsLoading(true)
    try {
      await handleLogout(router)
    } catch (error) {
      console.error('Logout error:', error)
      // Force redirect even if logout fails
      window.location.href = '/'
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleLogoutClick}
      disabled={isLoading}
      variant={variant}
      size={size}
      className={`flex items-center gap-2 ${className}`}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : showIcon ? (
        <LogOut className="w-4 h-4" />
      ) : null}
      {children}
    </Button>
  )
}
