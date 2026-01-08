"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, useMemo } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeft, Film, Star, ChevronDown } from 'lucide-react'
import { FaStar } from 'react-icons/fa'
import { Button } from '@/components/ui/Button'
import { useUser } from '@/components/providers/SessionProvider'
import { HomeLayout } from '@/components/layout/HomeLayout'
import { SignedInLayout } from '@/components/layout/SignedInLayout'
import { getRateUrl } from '@/lib/slugHelper'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'

interface Actor {
  id: string
  name: string
  bio?: string
  imageUrl?: string
  birthDate?: string
  nationality?: string
  knownFor?: string
}

interface Performance {
  id: string
  actorId: string
  movieId: string
  character?: string | null
  emotionalRangeDepth?: number
  characterBelievability?: number
  technicalSkill?: number
  screenPresence?: number
  chemistryInteraction?: number
  actor: {
    id: string
    name: string
    slug?: string | null
  }
  movie: {
    id: string
    title: string
    year: number
    director?: string
    slug?: string | null
  }
}

export default function ActorPage() {
  const params = useParams()
  const router = useRouter()
  const user = useUser()
  const actorId = params?.id as string

  const [actor, setActor] = useState<Actor | null>(null)
  const [performances, setPerformances] = useState<Performance[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'relevance' | 'alphabetical' | 'year' | 'rating'>('year')
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`/api/actors/${actorId}`)
        if (!response.ok) throw new Error('Failed to fetch actor')
        
        const data = await response.json()
        setActor(data)
        setPerformances(data.performances || [])
      } catch (error) {
        console.error('Error fetching actor:', error)
      } finally {
        setLoading(false)
      }
    }

    if (actorId) {
      fetchData()
    }
  }, [actorId])

  // Close dropdown and update sort when search query changes
  useEffect(() => {
    setSortDropdownOpen(false)
    // Auto-switch to relevance when searching, back to year when cleared
    if (searchQuery.trim() && sortBy === 'year') {
      setSortBy('relevance')
    } else if (!searchQuery.trim() && sortBy === 'relevance') {
      setSortBy('year')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // Calculate career score from performances with ratings
  const calculatePerformanceScore = (perf: Performance) => {
    if (!perf.emotionalRangeDepth && !perf.characterBelievability && !perf.technicalSkill && !perf.screenPresence && !perf.chemistryInteraction) {
      return null
    }
    const scores = [
      perf.emotionalRangeDepth,
      perf.characterBelievability,
      perf.technicalSkill,
      perf.screenPresence,
      perf.chemistryInteraction
    ].filter((s): s is number => typeof s === 'number' && s > 0)
    
    if (scores.length === 0) return null
    return scores.reduce((sum, score) => sum + score, 0) / scores.length
  }

  const performancesWithScores = useMemo(() => {
    return performances.map(perf => ({
      ...perf,
      averageScore: calculatePerformanceScore(perf)
    }))
  }, [performances])

  const scoredPerformances = useMemo(() => {
    return performancesWithScores.filter(p => p.averageScore !== null)
  }, [performancesWithScores])

  const careerScore = useMemo(() => {
    return scoredPerformances.length > 0
      ? scoredPerformances.reduce((sum, perf) => sum + (perf.averageScore || 0), 0) / scoredPerformances.length
      : null
  }, [scoredPerformances])

  // Filter and rank performances based on search query
  const filteredPerformances = useMemo(() => {
    if (!searchQuery.trim()) {
      return performancesWithScores
    }

    const query = searchQuery.toLowerCase().trim()
    const scored = performancesWithScores.map(perf => {
      const movieTitle = perf.movie.title.toLowerCase()
      const character = (perf.character || '').toLowerCase()
      
      let score = 0
      
      // Exact title match gets highest score
      if (movieTitle === query) {
        score += 100
      } else if (movieTitle.startsWith(query)) {
        score += 80
      } else if (movieTitle.includes(query)) {
        score += 60
      }
      
      // Character match
      if (character.includes(query)) {
        score += 40
      }
      
      // Year match
      if (perf.movie.year.toString().includes(query)) {
        score += 20
      }
      
      return { ...perf, searchScore: score }
    })

    // Filter by search score (only show matches)
    return scored.filter(p => p.searchScore > 0)
  }, [performancesWithScores, searchQuery])

  // Apply sorting to filtered performances
  const filteredAndRankedPerformances = useMemo(() => {
    let sorted = [...filteredPerformances]

    switch (sortBy) {
      case 'alphabetical':
        sorted.sort((a, b) => a.movie.title.localeCompare(b.movie.title))
        break
      case 'year':
        sorted.sort((a, b) => b.movie.year - a.movie.year) // Newest first
        break
      case 'rating':
        sorted.sort((a, b) => {
          const aScore = a.averageScore || 0
          const bScore = b.averageScore || 0
          if (bScore !== aScore) {
            return bScore - aScore
          }
          return b.movie.year - a.movie.year
        })
        break
      case 'relevance':
      default:
        // If searching, sort by search score, otherwise by year
        if (searchQuery.trim()) {
          sorted.sort((a, b) => {
            const aScore = (a as any).searchScore || 0
            const bScore = (b as any).searchScore || 0
            if (bScore !== aScore) {
              return bScore - aScore
            }
            return b.movie.year - a.movie.year
          })
        } else {
          sorted.sort((a, b) => b.movie.year - a.movie.year)
        }
        break
    }

    return sorted
  }, [filteredPerformances, sortBy, searchQuery])

  const Layout = user ? SignedInLayout : HomeLayout

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <BouncingBallsLoader size="lg" color="#FFD700" />
        </div>
      </Layout>
    )
  }

  if (!actor) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Actor not found</h1>
            <Button onClick={() => router.push('/search')}>Back to Search</Button>
          </div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="min-h-screen bg-black">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-12 sm:pb-16">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 sm:mb-8"
          >
            <Link
              href={user ? "/dashboard" : "/"}
              className="inline-flex items-center justify-center w-10 h-10 sm:w-10 sm:h-10 rounded-full border border-gray-600/50 text-gray-400 hover:text-[#FFD700] hover:bg-[#FFD700]/10 hover:border-[#FFD700]/50 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </motion.div>

          {/* Actor Info */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-12"
          >
            <h1 
              className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold mb-6 sm:mb-8 md:mb-10 lg:mb-12 text-white"
              style={{ 
                fontFamily: 'var(--font-cinzel), serif',
                textShadow: '0 10px 40px rgba(0,0,0,0.7)',
                letterSpacing: '0.08em',
                lineHeight: '1.1',
              }}
            >
              {actor.name}
            </h1>
              
            {/* Gold Divider - Cinematic */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "180px", opacity: 1 }}
              transition={{ duration: 2, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="h-[2px] mx-auto mb-6 sm:mb-8 md:mb-10 lg:mb-12 relative"
            >
              <div 
                className="h-full w-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,229,92,0.4) 15%, rgba(255,215,0,0.9) 40%, rgba(255,215,0,1) 50%, rgba(255,215,0,0.9) 60%, rgba(255,229,92,0.4) 85%, transparent 100%)',
                  boxShadow: '0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)',
                }}
              />
            </motion.div>

            {/* Career Score */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9, ease: 'easeOut' }}
              className="mb-8"
            >
              <div className="inline-flex items-center gap-3 px-10 py-6 rounded-[2rem] bg-gradient-to-r from-[#FFD700]/20 via-[#FFD700]/15 to-[#FFA500]/15 border-2 border-[#FFD700]/50">
                <Star className="w-8 h-8 sm:w-10 sm:h-10 text-[#FFD700] fill-[#FFD700]" />
                <div className="text-left">
                  <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[#FFD700] leading-tight">
                    {careerScore !== null ? `${(careerScore / 10).toFixed(1)}/10` : 'N/A'}
                  </div>
                  <div className="text-base sm:text-lg text-[#FFD700]/90 font-medium mt-1">
                    {careerScore !== null 
                      ? `Career Score • ${scoredPerformances.length} ${scoredPerformances.length === 1 ? 'rated performance' : 'rated performances'}`
                      : `No ratings yet`
                    }
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>

      {/* Performances Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {performances.length > 0 ? (
          <>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mb-10 sm:mb-12"
            >
              {/* Mobile: Stacked layout, Desktop: Same line */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 sm:gap-4 mb-8 sm:mb-6">
                {/* Left side: Filmography heading and bubble */}
                <div className="flex items-center gap-3 sm:gap-4 flex-nowrap justify-center sm:justify-start">
                  <Film className="w-7 h-7 sm:w-6 sm:h-6 text-[#FFD700] flex-shrink-0" />
                  <h2 
                    className="text-4xl sm:text-5xl md:text-6xl font-bold text-center sm:text-left flex-shrink-0"
                    style={{ 
                      fontFamily: 'var(--font-cinzel), serif',
                      letterSpacing: '0.02em',
                    }}
                  >
                    <span 
                      style={{
                        background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                      }}
                    >
                      Filmography
                    </span>
                  </h2>
                </div>
                
                {/* Right side: Search Bar and Sort */}
                <div className="flex items-center gap-4 sm:gap-3 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-96 lg:w-[28rem] max-w-full">
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search performances..."
                        className="w-full pl-12 pr-10 py-4 sm:py-3 rounded-full bg-[#1a1a1a] border border-white/10 text-white placeholder:text-gray-500 focus:outline-none focus:ring-0 focus:border-[#FFD700]/50 transition-all text-base"
                        style={{ borderRadius: '9999px' }}
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Sort Button */}
                  <div className="relative">
                    <button
                      onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
                      className="flex items-center gap-2 px-4 py-4 sm:py-3 rounded-full bg-[#1a1a1a] border border-white/10 text-white hover:border-[#FFD700]/50 transition-all text-sm font-medium whitespace-nowrap"
                    >
                      <span>
                        {sortBy === 'relevance' ? (searchQuery.trim() ? 'Relevance' : 'Year') : 
                         sortBy === 'alphabetical' ? 'A-Z' :
                         sortBy === 'year' ? 'Year' : 'Rating'}
                      </span>
                      <ChevronDown className={`w-4 h-4 transition-transform ${sortDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {/* Sort Dropdown */}
                    {sortDropdownOpen && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setSortDropdownOpen(false)}
                        />
                        <div className="absolute right-0 mt-2 z-50 w-56 sm:w-48 rounded-[1.5rem] bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 border border-white/10 backdrop-blur-2xl shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_0_0_rgba(0,0,0,0.3)] overflow-hidden">
                          <button
                            onClick={() => {
                              setSortBy('alphabetical')
                              setSortDropdownOpen(false)
                            }}
                            className={`w-full px-5 py-4 sm:px-4 sm:py-3 text-left text-base sm:text-sm transition-colors ${
                              sortBy === 'alphabetical' 
                                ? 'text-[#FFD700] bg-[#FFD700]/10' 
                                : 'text-gray-300 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            Alphabetical (A-Z)
                          </button>
                          <button
                            onClick={() => {
                              setSortBy('year')
                              setSortDropdownOpen(false)
                            }}
                            className={`w-full px-5 py-4 sm:px-4 sm:py-3 text-left text-base sm:text-sm transition-colors ${
                              sortBy === 'year' 
                                ? 'text-[#FFD700] bg-[#FFD700]/10' 
                                : 'text-gray-300 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            Year (Newest)
                          </button>
                          <button
                            onClick={() => {
                              setSortBy('rating')
                              setSortDropdownOpen(false)
                            }}
                            className={`w-full px-5 py-4 sm:px-4 sm:py-3 text-left text-base sm:text-sm transition-colors ${
                              sortBy === 'rating' 
                                ? 'text-[#FFD700] bg-[#FFD700]/10' 
                                : 'text-gray-300 hover:text-white hover:bg-white/5'
                            }`}
                          >
                            Rating (Highest)
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {filteredAndRankedPerformances.length > 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredAndRankedPerformances.map((performance, index) => {
                const rateUrl = getRateUrl(
                  { id: performance.actor.id, name: performance.actor.name, slug: performance.actor.slug || null },
                  { id: performance.movie.id, title: performance.movie.title, year: performance.movie.year, slug: performance.movie.slug || null }
                )
                const character = performance.character || "—"
                const rating = performance.averageScore ? `${(performance.averageScore / 10).toFixed(1)}` : null

                return (
                  <motion.div
                    key={performance.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.3 + index * 0.05, ease: [0.22, 1, 0.36, 1] }}
                    style={{ willChange: 'transform, opacity' }}
                    className="group relative"
                  >
                    {/* Premium Card - Clean & Cinematic - Matching performances page */}
                    <div 
                      className="relative h-full p-8 sm:p-10 md:p-12 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,215,0,0.12)]"
                      style={{
                        boxShadow: `
                          0 25px 70px -15px rgba(0, 0, 0, 0.9),
                          0 15px 40px -10px rgba(0, 0, 0, 0.7),
                          0 0 0 1px rgba(255, 255, 255, 0.05),
                          inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                          inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                        `,
                      }}
                    >
                      {/* Glow effect */}
                      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-[2rem] overflow-hidden pointer-events-none">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl" />
                      </div>

                      {/* Content */}
                      <div className="relative z-10 flex flex-col h-full">
                        <div className="flex-1">
                          {/* Top Row: Rating Badge and Year */}
                          <div className="flex items-center justify-between mb-6">
                            {/* Score Pill - Top Left - Bigger */}
                            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/15 border border-[#FFD700]/40">
                              <FaStar className="w-5 h-5 text-[#FFD700]" />
                              <span className="text-2xl font-bold text-[#FFD700]">
                                {rating || 'N/A'}
                              </span>
                            </div>
                            
                            {/* Movie Year - Top Right */}
                            <div className="text-[#a3a3a3] text-base font-medium">
                              {performance.movie.year}
                            </div>
                          </div>

                          {/* Movie Title */}
                          <div className="mb-4">
                            <span className="text-lg text-[#FFD700] font-semibold tracking-wide">
                              {performance.movie.title}
                            </span>
                          </div>

                          {/* Character */}
                          <div className="mb-6">
                            <p className="text-lg sm:text-xl text-[#e4e4e7] leading-relaxed italic font-light">
                              as {character}
                            </p>
                          </div>
                        </div>

                        {/* Rate Button */}
                        <div className="mt-auto pt-4">
                          <Link href={rateUrl}>
                            <button 
                              className="w-full px-8 py-4 rounded-full text-black text-base font-bold tracking-wider uppercase transition-all duration-500 hover:scale-105"
                              style={{
                                background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                              }}
                            >
                              <span className="flex items-center justify-center gap-2">
                                Rate
                                <FaStar className="w-4 h-4" />
                              </span>
                            </button>
                          </Link>
                        </div>
                      </div>

                      {/* Decorative accent */}
                      <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#FFD700]/5 to-transparent rounded-tr-[80px]" />
                    </div>
                  </motion.div>
                )
              })}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center py-16"
              >
                <div className="inline-block p-8 rounded-[2rem] bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.4),0_0_0_1px_rgba(255,255,255,0.05),inset_0_1px_0_0_rgba(255,255,255,0.1),inset_0_-1px_0_0_rgba(0,0,0,0.3)]">
                  <Film className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-300 mb-2">No performances found</h3>
                  <p className="text-gray-500">
                    {searchQuery 
                      ? `No performances match "${searchQuery}"`
                      : "This actor doesn't have any performances yet."
                    }
                  </p>
                </div>
              </motion.div>
            )}
          </>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-center py-16"
          >
            <div 
              className="relative mx-auto w-fit p-8 sm:p-10 rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl"
              style={{
                boxShadow: `
                  0 25px 70px -15px rgba(0, 0, 0, 0.9),
                  0 15px 40px -10px rgba(0, 0, 0, 0.7),
                  0 0 0 1px rgba(255, 255, 255, 0.05),
                  inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                  inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                `,
              }}
            >
              <Film className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-xl text-gray-400">No performances found for this actor yet.</p>
            </div>
          </motion.div>
        )}
      </div>

      </div>
    </Layout>
  )
}
