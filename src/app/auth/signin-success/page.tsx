"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useUser } from '@supabase/auth-helpers-react'
import { CheckCircle, Loader2 } from 'lucide-react'

export default function SigninSuccessPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [isSubmittingRating, setIsSubmittingRating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handlePendingRating = async () => {
      // Wait for session to be available
      if (status === 'loading') return
      
      if (!session) {
        // If no session, redirect to signin
        router.push('/auth/signin')
        return
      }

      // Check if there's a pending rating to submit
      const pendingRating = localStorage.getItem('pendingRating')
      if (pendingRating) {
        setIsSubmittingRating(true)
        try {
          const ratingData = JSON.parse(pendingRating)
          
          // Submit the pending rating
          const ratingResponse = await fetch('/api/ratings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              actorId: ratingData.actorId,
              movieId: ratingData.movieId,
              emotionalRangeDepth: ratingData.emotionalRangeDepth,
              characterBelievability: ratingData.characterBelievability,
              technicalSkill: ratingData.technicalSkill,
              screenPresence: ratingData.screenPresence,
              chemistryInteraction: ratingData.chemistryInteraction,
              comment: ratingData.comment,
              recaptchaToken: 'bypass' // Skip reCAPTCHA for post-signin submission
            }),
          })

          if (ratingResponse.ok) {
            // Clear the pending rating
            localStorage.removeItem('pendingRating')
            
            // Redirect to the rating success page
            const successUrl = `/rating-success?actorName=${encodeURIComponent(ratingData.actorName)}&movieTitle=${encodeURIComponent(ratingData.movieTitle)}&movieYear=${ratingData.movieYear}&emotionalRangeDepth=${ratingData.emotionalRangeDepth}&characterBelievability=${ratingData.characterBelievability}&technicalSkill=${ratingData.technicalSkill}&screenPresence=${ratingData.screenPresence}&chemistryInteraction=${ratingData.chemistryInteraction}${ratingData.comment ? `&comment=${encodeURIComponent(ratingData.comment)}` : ''}`
            router.push(successUrl)
            return
          } else {
            throw new Error('Failed to submit rating')
          }
        } catch (error) {
          console.error('Failed to submit pending rating:', error)
          setError('Failed to submit your rating. Please try again.')
          // Clear the pending rating even if submission failed
          localStorage.removeItem('pendingRating')
        } finally {
          setIsSubmittingRating(false)
        }
      } else {
        // No pending rating, redirect to onboarding
        router.push('/onboarding')
      }
    }

    handlePendingRating()
  }, [session, status, router])

  if (status === 'loading' || isSubmittingRating) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">
            {isSubmittingRating ? 'Submitting your rating...' : 'Signing you in...'}
          </p>
        </div>
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
              onClick={() => router.push('/onboarding')}
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
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-primary" />
        <p className="text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  )
}
