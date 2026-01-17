"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import supabase from '@/lib/supabaseClient'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'
import { trackSignUp } from '@/lib/analytics'

export default function AuthCallback() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const handleAuthCallback = async () => {
      if (isProcessing) return
      setIsProcessing(true)
      
      // Prevent multiple executions
      if (typeof window !== 'undefined' && (window as any).__authCallbackProcessing) {
        return
      }
      if (typeof window !== 'undefined') {
        (window as any).__authCallbackProcessing = true
      }

      try {
        console.log('🔄 Starting auth callback...')
        
        // Check if there are auth parameters in the URL
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const error_description = searchParams.get('error_description')
        
        console.log('Auth params:', { 
          hasCode: !!code, 
          error, 
          error_description,
          url: typeof window !== 'undefined' ? window.location.href : 'server-side'
        })
        
        if (error) {
          console.error('OAuth error:', { error, error_description })
          // Don't show error immediately, try to get session first
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            console.log('✅ Found existing session despite OAuth error')
            // Check if there's a pending rating to submit
            const pendingRating = typeof window !== 'undefined' ? localStorage.getItem('pendingRating') : null
            if (pendingRating) {
              console.log('📝 Found pending rating, redirecting to signup-success')
              router.push('/auth/signup-success')
            } else {
              router.push('/dashboard')
            }
            return
          }
          setError(`Authentication failed: ${error_description || error}`)
          setIsLoading(false)
          return
        }

        if (code) {
          console.log('🔑 Exchanging code for session...')
          
          // Check if code verifier exists in storage (required for PKCE)
          const codeVerifier = typeof window !== 'undefined' 
            ? sessionStorage.getItem(`supabase.auth.code_verifier`) 
            : null
          
          if (!codeVerifier) {
            console.warn('⚠️ No code verifier found in storage, checking for existing session...')
            // Try to get existing session first
            const { data: { session } } = await supabase.auth.getSession()
            if (session) {
              console.log('✅ Found existing session, skipping code exchange')
              // Check if there's a pending rating to submit
              const pendingRating = typeof window !== 'undefined' ? localStorage.getItem('pendingRating') : null
              if (pendingRating) {
                console.log('📝 Found pending rating, redirecting to signup-success')
                router.push('/auth/signup-success')
              } else {
                // Check if user has ratings
                const ratingsRes = await fetch('/api/ratings/me', { cache: 'no-store' })
                if (ratingsRes.ok) {
                  const ratings = await ratingsRes.json()
                  if (Array.isArray(ratings) && ratings.length === 0) {
                    router.push('/onboarding/rate')
                  } else {
                    router.push('/dashboard')
                  }
                } else {
                  router.push('/onboarding/rate')
                }
              }
              return
            }
            // No session and no code verifier - redirect to sign-in
            console.log('🧹 No code verifier and no session, redirecting to sign-in')
            router.push('/auth/signin?error=pkce')
            return
          }
          
          // Exchange the code for a session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError)
            
            // Handle specific PKCE errors
            if (exchangeError.message?.includes('code verifier') || 
                exchangeError.message?.includes('PKCE') ||
                exchangeError.message?.includes('non-empty')) {
              console.log('🔍 PKCE error detected, checking for existing session...')
              
              // Try to get existing session before showing error
              const { data: { session } } = await supabase.auth.getSession()
              if (session) {
                console.log('✅ Found existing session despite PKCE error')
                // Check if there's a pending rating to submit
                const pendingRating = typeof window !== 'undefined' ? localStorage.getItem('pendingRating') : null
                if (pendingRating) {
                  console.log('📝 Found pending rating, redirecting to signup-success')
                  router.push('/auth/signup-success')
                } else {
                  // Check if user has ratings
                  const ratingsRes = await fetch('/api/ratings/me', { cache: 'no-store' })
                  if (ratingsRes.ok) {
                    const ratings = await ratingsRes.json()
                    if (Array.isArray(ratings) && ratings.length === 0) {
                      router.push('/onboarding/rate')
                    } else {
                      router.push('/dashboard')
                    }
                  } else {
                    router.push('/onboarding/rate')
                  }
                }
                return
              }
              
              // Clear any stale auth state and redirect to sign-in
              await supabase.auth.signOut()
              console.log('🧹 Cleared auth state, redirecting to sign-in')
              router.push('/auth/signin?error=pkce')
              return
            }
            
            setError('Failed to complete authentication. Please try again.')
            setIsLoading(false)
            return
          }

          if (data.session) {
            console.log('✅ Successfully authenticated via OAuth')
            // Track signup success for Google OAuth
            trackSignUp('google')
            // Check if there's a pending rating to submit
            const pendingRating = typeof window !== 'undefined' ? localStorage.getItem('pendingRating') : null
            if (pendingRating) {
              console.log('📝 Found pending rating, redirecting to signup-success')
              router.push('/auth/signup-success')
            } else {
              // Successfully authenticated, check if user has ratings
              // If no ratings, redirect to forced first rating
              const ratingsRes = await fetch('/api/ratings/me', { cache: 'no-store' })
              if (ratingsRes.ok) {
                const ratings = await ratingsRes.json()
                if (Array.isArray(ratings) && ratings.length === 0) {
                  router.push('/onboarding/rate')
                } else {
                  router.push('/dashboard')
                }
              } else {
                // If we can't check, redirect to onboarding to be safe
                router.push('/onboarding/rate')
              }
            }
            return
          }
        }

        // If no code, check current session
        console.log('🔍 Checking current session...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          setError('Failed to verify authentication. Please try again.')
          setIsLoading(false)
          return
        }

        if (session) {
          console.log('✅ Found existing session')
          // Track signup success for Google OAuth (if this is a new session from OAuth)
          // Only track if we came from OAuth flow (has code param or pending rating suggests new signup)
          if (code || (typeof window !== 'undefined' && localStorage.getItem('pendingRating'))) {
            trackSignUp('google')
          }
          // Check if there's a pending rating to submit
          const pendingRating = typeof window !== 'undefined' ? localStorage.getItem('pendingRating') : null
          if (pendingRating) {
            console.log('📝 Found pending rating, redirecting to signup-success')
            router.push('/auth/signup-success')
          } else {
            // Successfully authenticated, check if user has ratings
            // If no ratings, redirect to forced first rating
            const ratingsRes = await fetch('/api/ratings/me', { cache: 'no-store' })
            if (ratingsRes.ok) {
              const ratings = await ratingsRes.json()
              if (Array.isArray(ratings) && ratings.length === 0) {
                router.push('/onboarding/rate')
              } else {
                router.push('/dashboard')
              }
            } else {
              // If we can't check, redirect to onboarding to be safe
              router.push('/onboarding/rate')
            }
          }
        } else {
          console.log('❌ No session found, redirecting to sign-in')
          // No session found, redirect to sign-in
          router.push('/auth/signin')
        }
      } catch (err) {
        console.error('Unexpected error during auth callback:', err)
        // Try to get session before showing error
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            console.log('✅ Found session despite callback error')
            // Check if there's a pending rating to submit
            const pendingRating = typeof window !== 'undefined' ? localStorage.getItem('pendingRating') : null
            if (pendingRating) {
              console.log('📝 Found pending rating, redirecting to signup-success')
              router.push('/auth/signup-success')
            } else {
              router.push('/dashboard')
            }
            return
          }
        } catch {
          // Ignore session check errors
        }
        setError('An unexpected error occurred. Please try signing in again.')
        setIsLoading(false)
      } finally {
        setIsProcessing(false)
        if (typeof window !== 'undefined') {
          (window as any).__authCallbackProcessing = false
        }
      }
    }

    handleAuthCallback()
    
    return () => {
      if (typeof window !== 'undefined') {
        (window as any).__authCallbackProcessing = false
      }
    }
  }, [router, searchParams, isProcessing])

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-500 mb-4">Authentication Error</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => router.push('/auth/signin')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <BouncingBallsLoader 
          size="md" 
          color="#FFD700"
          showText={true}
          text="Completing sign in..."
        />
        <p className="text-muted-foreground mt-2">Please wait while we finish setting up your account.</p>
      </div>
    </div>
  )
}
