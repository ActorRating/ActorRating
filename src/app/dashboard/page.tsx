"use client"

import { useUser } from "@supabase/auth-helpers-react"
import { useRouter } from "next/navigation"
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react"
import { SignedInLayout } from "@/components/layout"
import { Button } from "@/components/ui/Button"
import Link from "next/link"
import { SearchBar } from "@/components/SearchBar"
import { motion } from "framer-motion"
import { fadeInUp } from "@/lib/animations"
import { suggestionsApi } from "@/lib/api"
import { PerformanceCard } from "@/components/performance/PerformanceCard"

const dominoContainer = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.06,
    },
  },
}
// Removed icons to avoid runtime issues with missing exports in certain environments
import { Calendar, Star, Film, ChevronDown, Pencil, Trash2, User } from "lucide-react"

const ENABLE_SUGGESTED_RATINGS = false

interface Rating {
  id: string
  emotionalRangeDepth: number
  characterBelievability: number
  technicalSkill: number
  screenPresence: number
  chemistryInteraction: number
  weightedScore: number | null
  comment: string | null
  createdAt: string
  actor: {
    id: string
    name: string
    imageUrl: string | null
  }
  movie: {
    id: string
    title: string
    year: number
    director: string
  }
}

export default function DashboardPage() {
  const user = useUser()
  const router = useRouter()
  const [ratings, setRatings] = useState<Rating[]>([])
  const [isLoadingData, setIsLoadingData] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Pagination state
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState<boolean>(true)
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false)
  const loadMoreRef = useRef<HTMLDivElement | null>(null)

  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [suggestedPerformances, setSuggestedPerformances] = useState<Array<{
    id: string
    actorId: string
    movieId: string
    ratingsCount: number
    comment?: string | null
    actor: { id: string; name: string; imageUrl: string | null }
    movie: { id: string; title: string; year: number; director: string | null }
  }>>([])
  const [suggestionsAnimKey, setSuggestionsAnimKey] = useState(0)
  const [showAllRecent, setShowAllRecent] = useState(false)

  // Wait until Supabase resolves the session
  useEffect(() => {
    if (user === undefined) return
    if (user === null) router.replace("/auth/signin")
  }, [user, router])

  useEffect(() => {
    if (user) {
      fetchUserRatings()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const fetchUserRatings = async () => {
    try {
      setIsLoadingData(true)
      const response = await fetch("/api/user/ratings?limit=20", { cache: "no-store" })

      if (response.status === 401) {
        router.push("/auth/signin")
        return
      }

      let data: any = null
      try {
        data = await response.json()
      } catch (_) {
        // ignore JSON parse errors; we'll fall back below
      }

      if (!response.ok) {
        setError(data?.error || "We couldn’t load your data. Please try again.")
        setRatings([])
        return
      }
      if (Array.isArray(data?.items)) {
        setRatings(data.items)
        setCursor(data?.nextCursor ?? null)
        setHasMore(Boolean(data?.nextCursor))
      } else if (Array.isArray(data?.ratings)) {
        // Backward compatibility
        setRatings(data.ratings)
        setCursor(null)
        setHasMore(false)
      } else {
        setRatings([])
        setCursor(null)
        setHasMore(false)
      }
    } catch (err) {
      console.error("Error fetching ratings:", err)
      setError("We couldn’t load your data. Please try again.")
    } finally {
      setIsLoadingData(false)
    }
  }

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !cursor) return
    try {
      setIsLoadingMore(true)
      const response = await fetch(`/api/user/ratings?limit=20&cursor=${encodeURIComponent(cursor)}`, { cache: "no-store" })
      const data = await response.json().catch(() => ({}))
      if (Array.isArray(data?.items)) {
        setRatings(prev => [...prev, ...data.items])
        setCursor(data?.nextCursor ?? null)
        setHasMore(Boolean(data?.nextCursor))
      } else {
        setHasMore(false)
      }
    } finally {
      setIsLoadingMore(false)
    }
  }, [cursor, hasMore, isLoadingMore])

  // Infinite scroll via IntersectionObserver
  useEffect(() => {
    if (!loadMoreRef.current) return
    const el = loadMoreRef.current
    const observer = new IntersectionObserver((entries) => {
      const first = entries[0]
      if (first.isIntersecting) {
        loadMore()
      }
    }, { rootMargin: "1200px 0px 1200px 0px" })
    observer.observe(el)
    return () => observer.unobserve(el)
  }, [loadMore])

  const beginEdit = (rating: Rating) => {
    // Navigate to the rate page with the current rating values
    const params = new URLSearchParams({
      actor: rating.actor.id,
      movie: rating.movie.id,
      rating: rating.id,
      edit: 'true'
    })
    router.push(`/rate?${params.toString()}`)
  }



  // Fetch suggested performances (popular, trending, related mix)
  useEffect(() => {
    if (!ENABLE_SUGGESTED_RATINGS) return
    const fetchSuggestions = async () => {
      try {
        const data = await suggestionsApi.getPerformances()
        if (Array.isArray(data?.items)) {
          setSuggestedPerformances(data.items.slice(0, 6))
        } else {
          setSuggestedPerformances([])
        }
      } catch (e) {
        setSuggestedPerformances([])
      }
    }
    fetchSuggestions()
  }, [])

  // Retrigger domino animation whenever suggestions data arrives/changes
  useEffect(() => {
    if (!ENABLE_SUGGESTED_RATINGS) return
    if (suggestedPerformances.length > 0) {
      setSuggestionsAnimKey((k) => k + 1)
    }
  }, [suggestedPerformances])

  const deleteRating = async (id: string) => {
    if (!confirm("Delete this rating? This cannot be undone.")) return
    setDeletingId(id)
    try {
      const response = await fetch(`/api/ratings/${id}`, { method: "DELETE" })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || "Failed to delete rating")
      }
      // Optimistically remove or refetch
      setRatings(prev => prev.filter(r => r.id !== id))
    } catch (e) {
      console.error("Failed to delete rating:", e)
      alert(e instanceof Error ? e.message : "Failed to delete rating")
    } finally {
      setDeletingId(null)
    }
  }

  const displayScoreFor = (rating: Rating): number => {
    if (typeof rating.weightedScore === "number" && !Number.isNaN(rating.weightedScore)) {
      return rating.weightedScore
    }
    return (
      (rating.emotionalRangeDepth +
        rating.characterBelievability +
        rating.technicalSkill +
        rating.screenPresence +
        rating.chemistryInteraction) / 5
    )
  }

  const overallAverage = useMemo(() => {
    if (!ratings.length) return 0
    const sum = ratings.reduce((acc, r) => acc + displayScoreFor(r), 0)
    return sum / ratings.length
  }, [ratings])

  const uniqueActorsCount = useMemo(() => new Set(ratings.map(r => r.actor.id)).size, [ratings])

  const recentRatings = ratings
  const displayedRecentRatings = showAllRecent ? recentRatings : recentRatings.slice(0, 4)

  if (user === undefined) return <p>Loading...</p>
  if (user === null) return null

  if (isLoadingData) {
    return (
      <SignedInLayout>
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-background/80 flex items-center justify-center">
          <div className="text-center">
            <div className="relative">
              <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary/20 border-t-primary mx-auto mb-4" />
              <div className="absolute inset-0 h-16 w-16 animate-pulse rounded-full bg-primary/10 mx-auto" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-2">Loading your dashboard</h2>
            <p className="text-sm text-muted-foreground">Preparing your performance ratings...</p>
          </div>
        </div>
      </SignedInLayout>
    )
  }


  return (
    <SignedInLayout>
      <div className="min-h-screen">
        <div className="relative overflow-hidden">
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            
            {/* Welcome Section */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-center mb-12 sm:mb-16 px-4 sm:px-6"
            >
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 sm:mb-8">
                Welcome back
              </h1>
              <p className="text-gray-400 text-lg sm:text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
                Rate performances and discover exceptional acting
              </p>
              
              {/* Search Bar */}
              <div className="max-w-lg mx-auto mb-8">
                <SearchBar 
                  placeholder="Search actors, movies..." 
                  onSearch={(query) => {
                    if (query.trim()) {
                      window.location.href = `/search?q=${encodeURIComponent(query.trim())}`
                    }
                  }}
                />
              </div>

              {/* Quick Action */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <Button asChild variant="premium" size="lg" className="bg-purple-600 text-white hover:bg-purple-700">
                  <Link href="/search">
                    <Star className="w-5 h-5 mr-2" />
                    Rate a Performance
                  </Link>
                </Button>
              </motion.div>
            </motion.div>

            {/* Stats Cards */}
            {ratings.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="grid grid-cols-3 gap-4 sm:gap-6 mb-12 sm:mb-16 px-4 sm:px-6"
              >
                {/* Average Score */}
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center backdrop-blur-sm">
                  <Star className="w-6 h-6 sm:w-7 sm:h-7 text-yellow-400 mx-auto mb-3 fill-current" />
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-yellow-400 mb-2">
                    {overallAverage.toFixed(1)}
                  </div>
                  <div className="text-sm sm:text-base text-yellow-300/80 font-medium">
                    Avg Score
                  </div>
                </div>

                {/* Total Ratings */}
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center backdrop-blur-sm">
                  <Film className="w-6 h-6 sm:w-7 sm:h-7 text-blue-400 mx-auto mb-3" />
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-blue-400 mb-2">
                    {ratings.length}
                  </div>
                  <div className="text-sm sm:text-base text-blue-300/80 font-medium">
                    Rating{ratings.length === 1 ? '' : 's'}
                  </div>
                </div>

                {/* Unique Actors */}
                <div className="bg-purple-500/20 border border-purple-500/30 rounded-xl sm:rounded-2xl p-4 sm:p-6 text-center backdrop-blur-sm">
                  <User className="w-6 h-6 sm:w-7 sm:h-7 text-purple-400 mx-auto mb-3" />
                  <div className="text-2xl sm:text-3xl lg:text-4xl font-bold text-purple-400 mb-2">
                    {uniqueActorsCount}
                  </div>
                  <div className="text-sm sm:text-base text-purple-300/80 font-medium">
                    Actor{uniqueActorsCount === 1 ? '' : 's'}
                  </div>
                </div>
              </motion.div>
            )}




          {/* Recent ratings */}
          {error ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="text-center py-16 bg-secondary/50 border border-border rounded-lg mx-4 sm:mx-6"
            >
              <Film className="w-12 h-12 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-300 mb-6">
                {error}
              </p>
              <Button variant="outline" onClick={fetchUserRatings}>
                Try Again
              </Button>
            </motion.div>
          ) : ratings.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
              className="text-center py-20 bg-gradient-to-br from-secondary/80 via-secondary/60 to-secondary/40 border border-border/50 rounded-2xl backdrop-blur-sm mx-4 sm:mx-6"
            >
              <div className="bg-gradient-to-br from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <Star className="w-10 h-10 text-yellow-400 fill-current" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3">Ready to start rating?</h3>
              <p className="text-gray-300 mb-8 max-w-md mx-auto text-lg">
                Discover incredible performances and share your perspective with the community.
              </p>
              <Button asChild variant="premium" size="lg" className="bg-purple-600 hover:bg-purple-700">
                <Link href="/search">
                  <Star className="w-5 h-5 mr-2" />
                  Start Rating Performances
                </Link>
              </Button>
            </motion.div>
          ) : (
            <section className="px-4 sm:px-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="mb-8"
              >
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl sm:text-3xl font-bold text-white">
                    Your Ratings
                  </h2>
                  {ratings.length > 4 && (
                    <Button
                      variant="ghost"
                      onClick={() => setShowAllRecent(prev => !prev)}
                      className="text-gray-400 hover:text-white text-sm"
                      aria-expanded={showAllRecent}
                      aria-controls="recent-ratings-list"
                    >
                      {showAllRecent ? 'Show less' : 'View all'}
                    </Button>
                  )}
                </div>
              </motion.div>
              <motion.ul 
                id="recent-ratings-list" 
                className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 lg:gap-8 items-start" 
                variants={dominoContainer} 
                initial="hidden" 
                animate="show"
              >
                {displayedRecentRatings.map((rating, index) => (
                  <motion.li 
                    variants={fadeInUp} 
                    key={`rating-${rating.id}`} 
                    className="group relative bg-secondary/80 backdrop-blur-sm border border-border/50 rounded-xl sm:rounded-2xl p-5 sm:p-6 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 self-start"
                  >
                    {/* Subtle background glow on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.02] via-transparent to-accent/[0.02] rounded-xl sm:rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="relative z-10">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-white text-lg leading-tight mb-1 group-hover:text-purple-400 transition-colors">
                            <Link href={`/actors/${rating.actor.id}`} className="hover:underline">
                              {rating.actor.name}
                            </Link>
                          </h3>
                          <p className="text-sm text-gray-400 flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-blue-400" />
                            <span>in "{rating.movie.title}" ({rating.movie.year})</span>
                          </p>
                        </div>
                        
                        {/* Rating Score */}
                        <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border border-yellow-500/30 rounded-xl px-3 py-2 text-center flex-shrink-0 backdrop-blur-sm">
                          <Star className="w-4 h-4 text-yellow-400 fill-current mx-auto mb-1" />
                          <div className="text-lg font-bold text-yellow-400">
                            {displayScoreFor(rating).toFixed(1)}
                          </div>
                        </div>
                      </div>

                    {/* Character and Movie Info */}
                    <div className="space-y-2 mb-4">
                      {/* Movie Badge */}
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 backdrop-blur-sm">
                        <Film className="w-3 h-3 text-purple-400 flex-shrink-0" />
                        <span className="font-medium text-purple-300 text-sm">
                          <Link href={`/movies/${rating.movie.id}`} className="hover:underline">
                            "{rating.movie.title}"
                          </Link>
                        </span>
                      </div>
                      
                      {/* Character Info */}
                      {rating.comment && rating.comment.trim().length > 0 && (
                        (() => {
                          const raw = rating.comment
                          let text = raw.split(/,\s*Director:/i)[0]
                          text = text.replace(/^\s*(Character\s*[:\-]\s*)/i, '')
                          text = text.replace(/^\s*as\s+/i, '')
                          text = text.replace(/^"|"$/g, '')
                          text = text.trim()
                          
                          // Extract director info if present
                          const directorMatch = raw.match(/,\s*Director:\s*(.+)/i)
                          const director = directorMatch ? directorMatch[1].trim() : null
                          
                          return (
                            <div className="flex flex-wrap gap-2">
                              {text && (
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-blue-500/30 bg-blue-500/10 backdrop-blur-sm">
                                  <span className="font-medium text-blue-300 text-sm">Character: {text}</span>
                                </div>
                              )}
                              {director && (
                                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-green-500/30 bg-green-500/10 backdrop-blur-sm">
                                  <span className="font-medium text-green-300 text-sm">Director: {director}</span>
                                </div>
                              )}
                            </div>
                          )
                        })()
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-3 border-t border-border/30">
                      <div className="text-xs text-gray-400">
                        {new Date(rating.createdAt).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 transition-all"
                          onClick={() => beginEdit(rating)}
                          aria-label="Edit rating"
                          title="Edit rating"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-500/10 transition-all"
                          onClick={() => deleteRating(rating.id)}
                          disabled={deletingId === rating.id}
                          aria-label="Delete rating"
                          title="Delete rating"
                        >
                          {deletingId === rating.id ? (
                            <div className="h-3.5 w-3.5 animate-spin rounded-full border border-gray-400 border-t-transparent" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                    
                    {/* Expanded Details Button */}
                    <div className="w-full mt-3">
                      <button 
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          const detailsDiv = e.currentTarget.nextElementSibling as HTMLElement
                          const chevron = e.currentTarget.querySelector('svg')
                          if (detailsDiv && chevron) {
                            const isExpanded = detailsDiv.style.display === 'block'
                            detailsDiv.style.display = isExpanded ? 'none' : 'block'
                            chevron.style.transform = isExpanded ? 'rotate(0deg)' : 'rotate(180deg)'
                          }
                        }}
                        className="w-full cursor-pointer text-xs text-gray-400 hover:text-gray-300 flex items-center justify-center gap-1 py-2 rounded-lg hover:bg-gray-700/30 transition-all"
                      >
                        <span>View Detailed Scores</span>
                        <ChevronDown className="w-3 h-3 transition-transform duration-200" />
                      </button>
                      <div className="mt-3 pt-3 border-t border-border/30" style={{ display: 'none' }}>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {[
                            { key: 'emotionalRangeDepth', label: 'Emotional Range', value: rating.emotionalRangeDepth },
                            { key: 'characterBelievability', label: 'Believability', value: rating.characterBelievability },
                            { key: 'technicalSkill', label: 'Technical Skill', value: rating.technicalSkill },
                            { key: 'screenPresence', label: 'Screen Presence', value: rating.screenPresence },
                            { key: 'chemistryInteraction', label: 'Chemistry', value: rating.chemistryInteraction },
                          ].map(criterion => (
                            <div key={criterion.key} className="bg-background/50 rounded-lg p-2 text-center border border-border/30">
                              <div className="text-lg font-bold text-gray-300 mb-1">{criterion.value}</div>
                              <div className="text-xs text-gray-400 font-medium">{criterion.label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    </div>
                  </motion.li>
                ))}
              </motion.ul>
              {/* Load more sentinel (only when expanded) */}
              {showAllRecent && hasMore && (
                <div ref={loadMoreRef} className="mt-12 flex items-center justify-center">
                  <div className="flex items-center gap-3 px-6 py-3 rounded-full bg-muted/50 border border-border/50">
                    <div className="h-5 w-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading more ratings...</span>
                  </div>
                </div>
              )}
            </section>
           )}

          {/* Suggested ratings */}
          {ENABLE_SUGGESTED_RATINGS && (
            <section className="mt-12 px-4 sm:px-6">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-xl sm:text-2xl font-medium text-foreground" style={{ fontFamily: 'var(--font-dm-serif-display)' }}>Suggested ratings</h2>
                <Link href="/search" className="text-sm text-primary hover:underline">Explore more</Link>
              </div>
              <motion.ul key={suggestionsAnimKey} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6" variants={dominoContainer} initial="hidden" animate="show">
                {suggestedPerformances.map((item) => {
                  const perf = {
                    id: item.id,
                    actorId: item.actorId,
                    movieId: item.movieId,
                    emotionalRangeDepth: 50,
                    characterBelievability: 50,
                    technicalSkill: 50,
                    screenPresence: 50,
                    chemistryInteraction: 50,
                    // Hide comment to avoid showing director or character on suggested cards
                    comment: undefined,
                    user: { name: '', email: '' },
                    actor: { name: item.actor.name, imageUrl: item.actor.imageUrl ?? undefined },
                    movie: { title: item.movie.title, year: item.movie.year },
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  }
                  return (
                    <motion.li variants={fadeInUp} key={`suggestion-perf-${item.id}`} className="">
                      <PerformanceCard
                        performance={perf as any}
                        variant="compact"
                        ratingCount={item.ratingsCount}
                        averageRating={typeof (item as any).averageScore === 'number' ? (item as any).averageScore : undefined}
                        performanceType={null as any}
                        className="bg-muted/60 border border-border"
                        onClick={() => {
                          // SPA navigate to keep it smooth; prefetch handled by card
                          router.push(`/rate?actor=${encodeURIComponent(item.actorId)}&movie=${encodeURIComponent(item.movieId)}`)
                        }}
                      />
                    </motion.li>
                  )
                })}
              </motion.ul>
            </section>
          )}
          </div>
        </div>
        {/* Bottom padding for better spacing */}
        <div className="h-16 sm:h-20"></div>
      </div>
    </SignedInLayout>
  )
}
