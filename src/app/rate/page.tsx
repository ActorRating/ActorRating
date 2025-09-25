"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

import { SearchBar } from '@/components/SearchBar'
import { SignedInLayout, HomeLayout } from '@/components/layout'
import { actorsApi, moviesApi, ratingsApi, searchApi } from '@/lib/api'
import { useUser } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/navigation'
import { Actor, Movie, OscarRating, SearchResult, Rating } from '@/types'
import { Button } from '@/components/ui/Button'
import { ArrowLeft, User, Film, Star, Search, CheckCircle, Share2, Sparkles, Trophy, TrendingUp, Play } from 'lucide-react'
import Link from 'next/link'
import { PerformanceRatingClientWrapper } from '@/components/rating/PerformanceRatingClientWrapper'
import { useRecaptchaV3 } from '@/components/auth/ReCaptcha'
import { CelebrationConfetti } from '@/components/ui/Confetti'

export default function RatePage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const user = useUser()
  const actorId = searchParams.get('actor')
  const movieId = searchParams.get('movie')
  const ratingId = searchParams.get('rating') // For editing existing ratings
  
  const [actor, setActor] = useState<Actor | null>(null)
  const [movie, setMovie] = useState<Movie | null>(null)
  const [characterName, setCharacterName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [lastRatingId, setLastRatingId] = useState<string | null>(null)
  const [submittedRating, setSubmittedRating] = useState<Rating | null>(null)
  const [existingRating, setExistingRating] = useState<Rating | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { executeRecaptcha } = useRecaptchaV3()

  // Scroll to top when success page loads
  useEffect(() => {
    if (submitted && submittedRating) {
      window.scrollTo(0, 0)
    }
  }, [submitted, submittedRating])

  useEffect(() => {
    const fetchData = async () => {
      try {
        // If editing existing rating, fetch it first
        if (ratingId) {
          const ratingData = await ratingsApi.getById(ratingId)
          setExistingRating(ratingData)
          // Set actor and movie from the rating data
          if (ratingData.actor) {
            setActor({
              ...ratingData.actor,
              id: ratingData.actorId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
          }
          if (ratingData.movie) {
            setMovie({
              ...ratingData.movie,
              id: ratingData.movieId,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            })
          }
          setCharacterName(ratingData.comment || '')
        } else {
          // Regular flow for new ratings
          if (actorId) {
            const actorData = await actorsApi.getById(actorId)
            setActor(actorData)
          }
          if (movieId) {
            const movieData = await moviesApi.getById(movieId)
            setMovie(movieData)
            // If we also have an actor, try to resolve character from movie performances
            const selectedActorId = actorId || actor?.id
            if (selectedActorId && Array.isArray((movieData as any).performances)) {
              const perfForActor = (movieData as any).performances.find((p: any) => p.actor?.id === selectedActorId && p.comment && p.comment.trim().length > 0)
              if (perfForActor?.comment) {
                setCharacterName(perfForActor.comment)
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (actorId || movieId || ratingId) {
      fetchData()
    } else {
      setLoading(false)
    }
  }, [actorId, movieId, ratingId, actor?.id])

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (!query.trim()) {
      setSearchResults(null)
      return
    }

    setSearching(true)
    try {
      const results = await searchApi.global(query)
      setSearchResults(results)
    } catch (error) {
      console.error('Search failed:', error)
      setSearchResults(null)
    } finally {
      setSearching(false)
    }
  }

  const handlePerformanceSelect = (performance: any) => {
    setActor(performance.actor)
    setMovie(performance.movie)
    // Prefer the character name from the selected performance if available
    if (performance.comment && performance.comment.trim().length > 0) {
      setCharacterName(performance.comment)
    }
    setSearchResults(null)
    setSearchQuery('')
  }

  const handleSubmit = async (rating: any) => {
    if (!actor || !movie) return

    setSubmitting(true)
    setError(null)
    try {
      const recaptchaToken = await executeRecaptcha('submit_rating')

      const created: Rating = await ratingsApi.create({
        actorId: actor.id,
        movieId: movie.id,
        emotionalRangeDepth: rating.emotionalRangeDepth,
        characterBelievability: rating.characterBelievability,
        technicalSkill: rating.technicalSkill,
        screenPresence: rating.screenPresence,
        chemistryInteraction: rating.chemistryInteraction,
        comment: characterName || undefined,
        recaptchaToken,
      })
      setLastRatingId(created.id)
      setSubmittedRating(created)
      setSubmitted(true)
    } catch (err: any) {
      console.error('Failed to submit rating:', err)
      const errorMessage = err?.response?.data?.error || 'Failed to submit rating. Please try again.'
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const handleError = (errorMessage: string) => {
    setError(errorMessage)
  }

  // Helper function to get the appropriate layout
  const getLayout = (children: React.ReactNode) => {
    return session ? (
      <SignedInLayout>{children}</SignedInLayout>
    ) : (
      <HomeLayout>{children}</HomeLayout>
    )
  }

  // Unified submit handler for the wrapper (handles both create and update)
  const handleWrapperSubmit = async (ratingData: {
    emotionalRangeDepth: number
    characterBelievability: number
    technicalSkill: number
    screenPresence: number
    chemistryInteraction: number
  }) => {
    if (!actor || !movie) return

    // If user is not signed in, redirect to signup with rating data
    if (!session) {
      // Store rating data in localStorage for after signup
      const ratingDataToStore = {
        ...ratingData,
        actorId: actor.id,
        movieId: movie.id,
        actorName: actor.name,
        movieTitle: movie.title,
        movieYear: movie.year,
        comment: characterName,
        timestamp: new Date().toISOString()
      }
      
      localStorage.setItem('pendingRating', JSON.stringify(ratingDataToStore))
      
      // Redirect to signup page
      router.push('/auth/signup')
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const recaptchaToken = await executeRecaptcha('submit_rating')

      let result: Rating
      
      if (ratingId && existingRating) {
        // Update existing rating
        const response = await fetch(`/api/ratings/${ratingId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emotionalRangeDepth: ratingData.emotionalRangeDepth,
            characterBelievability: ratingData.characterBelievability,
            technicalSkill: ratingData.technicalSkill,
            screenPresence: ratingData.screenPresence,
            chemistryInteraction: ratingData.chemistryInteraction,
            comment: characterName || undefined,
            recaptchaToken,
          }),
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || 'Failed to update rating')
        }
        
        result = await response.json()
      } else {
        // Create new rating
        result = await ratingsApi.create({
          actorId: actor.id,
          movieId: movie.id,
          emotionalRangeDepth: ratingData.emotionalRangeDepth,
          characterBelievability: ratingData.characterBelievability,
          technicalSkill: ratingData.technicalSkill,
          screenPresence: ratingData.screenPresence,
          chemistryInteraction: ratingData.chemistryInteraction,
          comment: characterName || undefined,
          recaptchaToken,
        })
      }
      
      setLastRatingId(result.id)
      setSubmittedRating(result)
      setSubmitted(true)
    } catch (err: any) {
      console.error('Failed to submit rating:', err)
      const errorMessage = err?.response?.data?.error || 'Failed to submit rating. Please try again.'
      setError(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <Suspense fallback={null}>
        {getLayout(
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            <div className="text-center">
              <div className="animate-pulse">
                <div className="h-8 bg-muted rounded mb-4 max-w-md mx-auto"></div>
                <div className="h-4 bg-muted rounded mb-8 max-w-lg mx-auto"></div>
              </div>
            </div>
          </div>
        )}
      </Suspense>
    )
  }

  if (submitted && submittedRating) {
    // Calculate total score
    const totalScore = (
      submittedRating.emotionalRangeDepth * 0.25 +
      submittedRating.characterBelievability * 0.25 +
      submittedRating.technicalSkill * 0.20 +
      submittedRating.screenPresence * 0.15 +
      submittedRating.chemistryInteraction * 0.15
    )

    // Quality assessment
    const getQualityAssessment = (score: number) => {
      if (score >= 90) return { 
        level: 'Masterpiece', 
        color: 'text-amber-400', 
        bg: 'from-amber-400/20 to-yellow-400/20',
        icon: Trophy,
        description: 'Oscar-worthy performance!',
        message: 'Incredible! You\'ve witnessed true artistry!'
      }
      if (score >= 80) return { 
        level: 'Excellent', 
        color: 'text-emerald-400', 
        bg: 'from-emerald-400/20 to-green-400/20',
        icon: Star,
        description: 'Outstanding work!',
        message: 'Fantastic! This performance really stood out!'
      }
      if (score >= 70) return { 
        level: 'Good', 
        color: 'text-blue-400', 
        bg: 'from-blue-400/20 to-cyan-400/20',
        icon: CheckCircle,
        description: 'Solid performance',
        message: 'Nice! A well-executed performance!'
      }
      if (score >= 60) return { 
        level: 'Decent', 
        color: 'text-yellow-400', 
        bg: 'from-yellow-400/20 to-orange-400/20',
        icon: TrendingUp,
        description: 'Above average',
        message: 'Good work! Room for improvement though.'
      }
      return { 
        level: 'Mixed', 
        color: 'text-orange-400', 
        bg: 'from-orange-400/20 to-red-400/20',
        icon: TrendingUp,
        description: 'Mixed feelings',
        message: 'Thanks for the honest review!'
      }
    }

    const quality = getQualityAssessment(totalScore)

    return (
      <Suspense fallback={null}>
        {getLayout(
          <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 relative overflow-hidden">
            {/* Subtle background effect */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" />
            </div>

            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-10">
              <motion.div 
                initial={{ opacity: 0, scale: 0.8, y: 50 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ 
                  type: "spring", 
                  stiffness: 300, 
                  damping: 30,
                  delay: 0.2
                }}
                className="text-center"
              >
                {/* Success Icon with Animation */}
                <motion.div 
                  className="relative mx-auto mb-8"
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 500, 
                    damping: 15,
                    delay: 0.5
                  }}
                >
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-emerald-400/20 to-green-400/20 rounded-full flex items-center justify-center mx-auto relative">
                    <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 text-emerald-400" />
                  </div>
                </motion.div>

                {/* Main Success Message */}
                <motion.h1 
                  className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                >
                  Rating Submitted Successfully!
                </motion.h1>

                <motion.p 
                  className="text-base sm:text-lg lg:text-xl text-gray-300 mb-6 sm:mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 }}
                >
                  {quality.message}
                </motion.p>

                {/* Prominent Score Display */}
                <motion.div 
                  className="max-w-sm sm:max-w-md lg:max-w-lg mx-auto mb-6 sm:mb-8"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 300, 
                    damping: 30,
                    delay: 1.1
                  }}
                >
                  <div className={`relative bg-gradient-to-br ${quality.bg} rounded-2xl sm:rounded-3xl p-6 sm:p-8 border-2 border-primary/20 backdrop-blur-sm overflow-hidden`}>
                    {/* Background glow */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 opacity-50" />
                    
                    <div className="relative">
                      <div className="flex items-center justify-center gap-2 sm:gap-3 mb-3 sm:mb-4">
                        <quality.icon className={`w-6 h-6 sm:w-8 sm:h-8 ${quality.color}`} />
                        <h3 className={`text-xl sm:text-2xl lg:text-3xl font-bold ${quality.color}`}>
                          {quality.level}
                        </h3>
                        <quality.icon className={`w-6 h-6 sm:w-8 sm:h-8 ${quality.color}`} />
                      </div>

                      <motion.div 
                        className="flex items-center justify-center gap-2 sm:gap-3 lg:gap-4 mb-2 sm:mb-3"
                        animate={{
                          scale: [1, 1.05, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut"
                        }}
                      >
                        <div className={`text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black ${quality.color}`}>
                          {totalScore.toFixed(1)}
                        </div>
                        <Star className={`w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 xl:w-14 xl:h-14 ${quality.color} fill-current`} />
                      </motion.div>

                      <p className={`text-base sm:text-lg font-medium ${quality.color} mb-2`}>
                        {quality.description}
                      </p>
                      
                      {/* Performance breakdown */}
                      <div className="text-xs sm:text-sm text-gray-400 space-y-1">
                        <p className="break-words">{actor?.name} in "{movie?.title}" ({movie?.year})</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

                {/* Action Buttons */}
                <motion.div 
                  className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-6 sm:mb-8"
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.3 }}
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Button 
                      variant="premium"
                      size="lg"
                      onClick={() => {
                        // Navigate to search page instead of resetting
                        window.location.href = '/search'
                      }}
                      className="px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-bold rounded-xl sm:rounded-2xl min-w-[200px] sm:min-w-[240px] w-full sm:w-auto relative overflow-hidden touch-manipulation"
                    >
                      <div className="flex items-center gap-3">
                        <Play className="w-5 h-5" />
                        <span>Rate Another Performance</span>
                        <TrendingUp className="w-5 h-5" />
                      </div>
                    </Button>
                  </motion.div>

                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <button
                      onClick={async () => {
                        const base = process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/$/, '') || 'https://actorrating.com'
                        const url = base
                        const text = `I just rated ${actor?.name} in ${movie?.title} and gave it ${totalScore.toFixed(1)}/100! Check out ActorRating.com`
                        try {
                          if (typeof navigator !== 'undefined' && (navigator as any).share) {
                            await (navigator as any).share({ title: 'ActorRating', text, url })
                          } else {
                            await navigator.clipboard.writeText(`${text} - ${url}`)
                            alert('Rating shared to clipboard!')
                          }
                        } catch {
                          await navigator.clipboard.writeText(`${text} - ${url}`)
                          alert('Rating shared to clipboard!')
                        }
                      }}
                      className="inline-flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg font-bold rounded-xl sm:rounded-2xl bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 min-w-[180px] sm:min-w-[200px] w-full sm:w-auto touch-manipulation"
                    >
                      <Share2 className="w-5 h-5" />
                      <span>Share Your Rating</span>
                      <Sparkles className="w-5 h-5" />
                    </button>
                  </motion.div>
                </motion.div>

              </motion.div>
            </div>
          </div>
        )}
      </Suspense>
    )
  }

  // Show rating form when both actor and movie are selected
  if (actor && movie && !submitted) {
    return (
      <Suspense fallback={null}>
        {getLayout(
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <Button
                variant="outline"
                className="mb-6"
                onClick={() => { window.location.href = ratingId ? '/dashboard' : '/search'; }}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {ratingId ? 'Back to Dashboard' : 'Back to Search'}
              </Button>
              {ratingId && (
                <div className="text-center mb-4">
                  <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                    Edit Rating
                  </h1>
                  <p className="text-muted-foreground">
                    Update your rating for {actor?.name} in "{movie?.title}"
                  </p>
                </div>
              )}
            </motion.div>

            {/* Error Display */}
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <p className="text-red-800">{error}</p>
              </motion.div>
            )}

            {/* Rating Form */}
            <PerformanceRatingClientWrapper
              performance={{
                id: `${actor.id}-${movie.id}`,
                actor: {
                  id: actor.id,
                  name: actor.name,
                  imageUrl: actor.imageUrl
                },
                movie: {
                  id: movie.id,
                  title: movie.title,
                  year: movie.year,
                  director: movie.director
                },
                emotionalRangeDepth: 0,
                characterBelievability: 0,
                technicalSkill: 0,
                screenPresence: 0,
                chemistryInteraction: 0,
                comment: characterName,
                user: {
                  name: '',
                  email: ''
                },
                createdAt: '',
                updatedAt: ''
              }}
              onSubmit={handleWrapperSubmit}
              submitting={submitting}
              initialRating={existingRating ? {
                emotionalRangeDepth: existingRating.emotionalRangeDepth,
                characterBelievability: existingRating.characterBelievability,
                technicalSkill: existingRating.technicalSkill,
                screenPresence: existingRating.screenPresence,
                chemistryInteraction: existingRating.chemistryInteraction
              } : undefined}
            />
          </div>
        )}
      </Suspense>
    )
  }

  if (!actor || !movie) {
    return (
      <Suspense fallback={null}>
        {getLayout(
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-12"
          >
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">
              Rate a Performance
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Search for an actor and movie to rate their performance using our Oscar-inspired criteria
            </p>
          </motion.div>

          {/* Search Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-8"
          >
            <div className="max-w-2xl mx-auto mb-8">
              <SearchBar 
                placeholder="Search for actors, movies..."
                onSearch={handleSearch}
                initialValue={searchQuery}
                autoFocus
              />
            </div>

            {/* Search Results */}
            {searching && (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-muted-foreground">Searching...</p>
              </div>
            )}

            {searchResults && !searching && (
              <div className="max-w-4xl mx-auto">
                <h2 className="text-xl font-semibold text-foreground mb-6 text-center">
                  Search Results
                </h2>
                
                {/* Performances */}
                {searchResults.performances && searchResults.performances.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                      <Star className="w-5 h-5 text-primary" />
                      Performances ({searchResults.performances.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {searchResults.performances.slice(0, 6).map((performance) => (
                        <button
                          key={`performance-${performance.id}`}
                          onClick={() => handlePerformanceSelect(performance)}
                          className="text-left p-4 bg-secondary rounded-lg border border-border hover:border-primary transition-colors"
                        >
                          <div className="font-semibold text-foreground mb-1">
                            {performance.actor?.name} in "{performance.movie?.title}"
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {performance.movie?.year} • {performance.movie?.director}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actors */}
                {searchResults.actors && searchResults.actors.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                      <User className="w-5 h-5 text-accent" />
                      Actors ({searchResults.actors.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {searchResults.actors.slice(0, 6).map((actor) => (
                        <button
                          key={`rate-actor-${actor.id}`}
                          onClick={() => setActor(actor)}
                          className="text-left p-4 bg-secondary rounded-lg border border-border hover:border-primary transition-colors"
                        >
                          <div className="font-semibold text-foreground mb-1">
                            {actor.name}
                          </div>
                          {actor.nationality && (
                            <div className="text-sm text-muted-foreground">
                              {actor.nationality}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Movies */}
                {searchResults.movies && searchResults.movies.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                      <Film className="w-5 h-5 text-accent" />
                      Movies ({searchResults.movies.length})
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {searchResults.movies.slice(0, 6).map((movie) => (
                        <button
                          key={`movie-${movie.id}`}
                          onClick={() => setMovie(movie)}
                          className="text-left p-4 bg-secondary rounded-lg border border-border hover:border-primary transition-colors"
                        >
                          <div className="font-semibold text-foreground mb-1">
                            "{movie.title}"
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {movie.year} • {movie.director}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {searchResults.performances?.length === 0 && 
                 searchResults.actors?.length === 0 && 
                 searchResults.movies?.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">No results found. Try different keywords.</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>

          {/* Browse Options */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <p className="text-muted-foreground mb-4">Or browse our categories</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="outline">
                <Link href="/">
                  Back to Home
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
        )}
      </Suspense>
    )
  }
}