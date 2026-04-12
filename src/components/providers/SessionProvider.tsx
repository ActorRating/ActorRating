"use client"

import { createContext, useContext, useEffect, useState, useRef } from "react"
import { User, Session } from "@supabase/supabase-js"
import { useRouter, usePathname } from "next/navigation"
import { getSupabaseClient } from "@/lib/supabaseClient"
import { isDevMode, getDevSession } from "@/lib/devAuth"

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

  // Safety timeout: if loading takes more than 10 seconds, force initialization
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn('[SessionProvider] Loading timeout - forcing initialization')
        setLoading(false)
        setIsInitialized(true)
      }
    }, 10000)

    return () => clearTimeout(timeout)
  }, [loading])

  useEffect(() => {
    let mounted = true
    let redirectTimeout: NodeJS.Timeout | null = null

    // Get initial session
    const initializeAuth = async () => {
      try {
        // Development mode: use mock session
        if (isDevMode) {
          const devSession = getDevSession()
          if (mounted) {
            setSession(devSession as Session)
            setLoading(false)
            setIsInitialized(true)
            console.log('🔧 Dev mode: Using mock authentication')
          }
          return
        }
        
        const { data: { session }, error } = await getSupabaseClient().auth.getSession()
        
        if (error) {
          console.error('Error getting session:', error)
        }
        
        if (mounted) {
          setSession(session || null)
          setLoading(false)
          setIsInitialized(true)
          
          // Handle initial redirect for logged-in users (skip for sign-in page)
          // Only redirect once and only from specific pages
          if (session?.user && !redirectHandled.current) {
            // Only redirect from auth pages or home page, not from other pages
            if (pathname?.startsWith('/auth/') || pathname === '/') {
              // Skip redirect if we're on sign-in page (handled by sign-in page)
              if (pathname === '/auth/signin') {
                return
              }
              // Only redirect once
              redirectHandled.current = true
              // Use replace instead of push to avoid adding to history
              router.replace('/dashboard')
            }
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        // Always clear loading state even on error
        if (mounted) {
          setSession(null)
          setLoading(false)
          setIsInitialized(true)
        }
      }
    }

    initializeAuth()

    // Listen for auth changes (skip in dev mode)
    const {
      data: { subscription },
    } = getSupabaseClient().auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      // Skip auth state changes in dev mode
      if (isDevMode) return

      setSession(session)
      setLoading(false)
      setIsInitialized(true)

      // Clear any pending redirect timeout
      if (redirectTimeout) {
        clearTimeout(redirectTimeout)
        redirectTimeout = null
      }

      // Only handle redirects for SIGNED_IN event, not TOKEN_REFRESHED
      // TOKEN_REFRESHED happens frequently and shouldn't trigger redirects
      if (session?.user && event === 'SIGNED_IN' && !redirectHandled.current) {
        // Only redirect if on auth pages or home, not if already on a valid page
        if (pathname?.startsWith('/auth/') || pathname === '/') {
          // Skip redirect if we're on sign-in page
          if (pathname === '/auth/signin') {
            return
          }
          // Debounce redirect to prevent loops
          redirectHandled.current = true
          redirectTimeout = setTimeout(() => {
            if (mounted) {
              router.replace('/dashboard')
            }
          }, 100)
        }
      }

        // Handle sign out - only redirect if actually signed out
        if (!session?.user && event === 'SIGNED_OUT') {
          redirectHandled.current = false
          // Only redirect if not already on home page
          if (pathname !== '/') {
            redirectTimeout = setTimeout(() => {
              if (mounted) {
                router.replace('/')
              }
            }, 100)
          }
        }
    })

    return () => {
      mounted = false
      if (redirectTimeout) {
        clearTimeout(redirectTimeout)
      }
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