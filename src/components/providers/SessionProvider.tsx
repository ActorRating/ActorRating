"use client"

import { createContext, useContext, useEffect, useState, useRef } from "react"
import { User, Session } from "@supabase/supabase-js"
import { useRouter, usePathname } from "next/navigation"
import supabase from "@/lib/supabaseClient"

interface SessionContextType {
  session: Session | null
  user: User | null
  loading: boolean
  isInitialized: boolean
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  user: null,
  loading: true,
  isInitialized: false,
})

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isInitialized, setIsInitialized] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const redirectHandled = useRef(false)

  useEffect(() => {
    let mounted = true

    // Get initial session
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (mounted) {
          setSession(session)
          setLoading(false)
          setIsInitialized(true)
          
          // Handle initial redirect for logged-in users (skip for sign-in page)
          if (session?.user && !redirectHandled.current) {
            if (pathname?.startsWith('/auth/') || pathname === '/') {
              // Skip redirect if we're on sign-in page (handled by sign-in page)
              if (pathname === '/auth/signin') {
                return
              }
              // console.log('Initial redirect to dashboard from SessionProvider')
              redirectHandled.current = true
              router.push('/dashboard')
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          setLoading(false)
          setIsInitialized(true)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        // console.log('Auth state change:', { event, session: !!session, user: !!session?.user, pathname })
        setSession(session)
        setLoading(false)
        setIsInitialized(true)

        // Handle redirects for auth events (skip for email sign-in to prevent conflicts)
        if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && !redirectHandled.current) {
          // Only redirect if on auth pages or home, but not if we're already redirecting
          if (pathname?.startsWith('/auth/') || pathname === '/') {
            // Skip redirect if we're on sign-in page and using email auth (handled by sign-in page)
            if (pathname === '/auth/signin') {
              return
            }
            // console.log('Redirecting to dashboard from SessionProvider')
            redirectHandled.current = true
            router.push('/dashboard')
          }
        }

        // Handle sign out
        if (!session?.user && event === 'SIGNED_OUT') {
          redirectHandled.current = false
          // Always redirect to landing page on sign out from any page
          router.push('/')
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [router, pathname])

  return (
    <SessionContext.Provider value={{ 
      session, 
      user: session?.user ?? null, 
      loading, 
      isInitialized 
    }}>
      {children}
    </SessionContext.Provider>
  )
}

export const useSession = () => {
  const context = useContext(SessionContext)
  if (context === undefined) {
    throw new Error("useSession must be used within a SessionProvider")
  }
  return context
}

export const useUser = () => {
  const { user } = useSession()
  return user
}