"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { LogOut } from 'lucide-react'
import supabase from '@/lib/supabaseClient'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'

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
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('Logout error:', error)
      }
      
      // Clear any local storage items
      localStorage.removeItem('pendingRating')
      
      // Wait a moment for the session to clear, then force a full page reload
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Always use window.location.href for a full page reload to ensure session is cleared
      window.location.href = '/'
      
    } catch (error) {
      console.error('Logout error:', error)
      // Force redirect even if logout fails
      window.location.href = '/'
    } finally {
      setIsLoading(false)
    }
  }

  const buttonVariant = variant === 'destructive' ? 'outline' : variant
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
