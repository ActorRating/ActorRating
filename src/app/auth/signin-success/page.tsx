"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/components/providers/SessionProvider'
import { CheckCircle } from 'lucide-react'
import supabase from '@/lib/supabaseClient'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'

export default function SigninSuccessPage() {
  const router = useRouter()
  const { user, isInitialized } = useSession()
  const [isSubmittingRating, setIsSubmittingRating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handlePendingRating = async () => {
      // Wait for session to be initialized
      if (!isInitialized) {
        return
      }

      if (!user) {
        // If no session after initialization, redirect to signin
        router.push('/auth/signin')
        return
      }

      // Check if there's a pending rating to submit
      const pendingRating = localStorage.getItem('pendingRating')
      if (pendingRating) {
        setIsSubmittingRating(true)
        
        // Wait a bit for the session to be fully established on the server
        await new Promise(resolve => setTimeout(resolve, 1000))
        
        // Verify session is still valid
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          setError('Session expired. Please try signing in again.')
          setIsSubmittingRating(false)
          return
        }

        try {
          const ratingData = JSON.parse(pendingRating)
          
          // Map the rating data fields (modal uses shorter names)
          const apiRatingData = {
            actorId: ratingData.actorId,
            movieId: ratingData.movieId,
            emotionalRangeDepth: ratingData.emotionalRangeDepth ?? ratingData.emotionalDepth,
            characterBelievability: ratingData.characterBelievability ?? ratingData.believability,
            technicalSkill: ratingData.technicalSkill,
            screenPresence: ratingData.screenPresence,
            chemistryInteraction: ratingData.chemistryInteraction ?? ratingData.chemistry,
            comment: ratingData.comment,
            recaptchaToken: 'bypass' // Skip reCAPTCHA for post-signin submission
          }
          
          // Retry logic for rating submission
          let ratingResponse: Response | null = null
          let lastError: Error | null = null
          
          for (let attempt = 0; attempt < 3; attempt++) {
            try {
              ratingResponse = await fetch('/api/ratings', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(apiRatingData),
              })

              if (ratingResponse.ok) {
                break
              } else if (ratingResponse.status === 403 || ratingResponse.status === 401) {
                // If auth error, wait a bit longer and retry
                if (attempt < 2) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
                  continue
                }
              }
              
              const errorData = await ratingResponse.json().catch(() => ({}))
              throw new Error(errorData.error || `Failed to submit rating (${ratingResponse.status})`)
            } catch (err) {
              lastError = err instanceof Error ? err : new Error('Unknown error')
              if (attempt < 2) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
              }
            }
          }

          if (ratingResponse && ratingResponse.ok) {
            // Get the rating data from response
            const submittedRating = await ratingResponse.json()
            
            // Clear the pending rating
            localStorage.removeItem('pendingRating')
            
            // Store rating data temporarily for success card display
            sessionStorage.setItem('submittedRating', JSON.stringify(submittedRating))
            
            // Redirect to rate page to show success card (same as logged-in users see)
            const rateUrl = `/rate?actor=${ratingData.actorId}&movie=${ratingData.movieId}&submitted=true&ratingId=${submittedRating.id}`
            router.push(rateUrl)
            return
          } else {
            throw lastError || new Error('Failed to submit rating after retries')
          }
        } catch (error) {
          console.error('Failed to submit pending rating:', error)
          const errorMessage = error instanceof Error ? error.message : 'Failed to submit your rating. Please try again.'
          setError(errorMessage)
          // Don't clear the pending rating on error - let user retry
        } finally {
          setIsSubmittingRating(false)
        }
      } else {
        // No pending rating, redirect to dashboard (skip onboarding)
        router.push('/dashboard')
      }
    }

    handlePendingRating()
  }, [user, isInitialized, router])

  if (!isInitialized || user === undefined || isSubmittingRating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <BouncingBallsLoader 
          size="md" 
          color="#FFD700"
          showText={true}
          text={isSubmittingRating ? 'Submitting your rating...' : 'Signing you in...'}
        />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-red-500 mb-4">
            <CheckCircle className="w-16 h-16 mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-4">Welcome Back!</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
            >
              Continue to App
            </button>
            <button
              onClick={() => router.push('/search')}
              className="w-full bg-secondary text-secondary-foreground px-4 py-2 rounded-lg hover:bg-secondary/90 transition-colors"
            >
              Rate Another Performance
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <BouncingBallsLoader 
        size="md" 
        color="#FFD700"
        showText={true}
        text="Redirecting..."
      />
    </div>
  )
}
