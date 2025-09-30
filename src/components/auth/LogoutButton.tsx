"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { LogOut, Loader2 } from 'lucide-react'
import supabase from '@/lib/supabaseClient'

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
      
      // Immediately redirect to landing page
      router.push('/')
      
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
