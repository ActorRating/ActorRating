"use client"

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import supabase from '@/lib/supabaseClient'

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
          // Exchange the code for a session
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
          
          if (exchangeError) {
            console.error('Code exchange error:', exchangeError)
            
            // Handle specific PKCE errors
            if (exchangeError.message?.includes('code verifier') || 
                exchangeError.message?.includes('PKCE')) {
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
                  router.push('/dashboard')
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
            // Check if there's a pending rating to submit
            const pendingRating = typeof window !== 'undefined' ? localStorage.getItem('pendingRating') : null
            if (pendingRating) {
              console.log('📝 Found pending rating, redirecting to signup-success')
              router.push('/auth/signup-success')
            } else {
              // Successfully authenticated, redirect to dashboard
              router.push('/dashboard')
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
          // Check if there's a pending rating to submit
          const pendingRating = typeof window !== 'undefined' ? localStorage.getItem('pendingRating') : null
          if (pendingRating) {
            console.log('📝 Found pending rating, redirecting to signup-success')
            router.push('/auth/signup-success')
          } else {
            // Successfully authenticated, redirect to dashboard
            router.push('/dashboard')
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
      }
    }

    handleAuthCallback()
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
        <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <h1 className="text-xl font-semibold text-foreground mb-2">Completing sign in...</h1>
        <p className="text-muted-foreground">Please wait while we finish setting up your account.</p>
      </div>
    </div>
  )
}
