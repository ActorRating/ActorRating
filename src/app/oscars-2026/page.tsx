"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { FaTrophy, FaStar } from "react-icons/fa"
import { BouncingBallsLoader } from "@/components/ui/BouncingBallsLoader"
import { HomeLayout } from "@/components/layout"

// Oscar 2026 Nominees (announced January 2026)
const OSCAR_CATEGORIES = [
  {
    category: "Best Actor",
    nominees: [
      { name: "Timothée Chalamet", film: "Marty Supreme", character: null },
      { name: "Leonardo DiCaprio", film: "One Battle After Another", character: null },
      { name: "Ethan Hawke", film: "Blue Moon", character: null },
      { name: "Michael B. Jordan", film: "Sinners", character: null },
      { name: "Wagner Moura", film: "The Secret Agent", character: null },
    ],
  },
  {
    category: "Best Actress",
    nominees: [
      { name: "Jessie Buckley", film: "Hamnet", character: null },
      { name: "Rose Byrne", film: "If I Had Legs I'd Kick You", character: null },
      { name: "Kate Hudson", film: "Song Sung Blue", character: null },
      { name: "Renate Reinsve", film: "Sentimental Value", character: null },
      { name: "Emma Stone", film: "Bugonia", character: null },
    ],
  },
  {
    category: "Best Supporting Actor",
    nominees: [
      { name: "Benicio del Toro", film: "One Battle After Another", character: null },
      { name: "Jacob Elordi", film: "Frankenstein", character: null },
      { name: "Delroy Lindo", film: "Sinners", character: null },
      { name: "Sean Penn", film: "One Battle After Another", character: null },
      { name: "Stellan Skarsgård", film: "Sentimental Value", character: null },
    ],
  },
  {
    category: "Best Supporting Actress",
    nominees: [
      { name: "Elle Fanning", film: "Sentimental Value", character: null },
      { name: "Inga Ibsdotter Lilleaas", film: "Sentimental Value", character: null },
      { name: "Amy Madigan", film: "Weapons", character: null },
      { name: "Wunmi Mosaku", film: "Sinners", character: null },
      { name: "Teyana Taylor", film: "One Battle After Another", character: null },
    ],
  },
]

interface PerformanceData {
  actorSlug: string
  movieSlug: string
  averageRating: number
  ratingCount: number
}

export default function Oscars2026Page() {
  const router = useRouter()
  const [performanceData, setPerformanceData] = useState<Map<string, PerformanceData>>(new Map())
  const [isLoading, setIsLoading] = useState(true)
  const [loadingNominee, setLoadingNominee] = useState<string | null>(null)

  useEffect(() => {
    // Fetch performance data for all nominees
    async function fetchPerformanceData() {
      try {
        // Create lookup targets for all nominees
        const targets = OSCAR_CATEGORIES.flatMap(category =>
          category.nominees.map(nominee => ({
            actor: nominee.name,
            movie: nominee.film,
          }))
        )

        const response = await fetch('/api/performances/by-lookup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ targets }),
        })

        if (!response.ok) {
          console.error('Failed to fetch performance data')
          setIsLoading(false)
          return
        }

        const data = await response.json()
        const newPerformanceData = new Map<string, PerformanceData>()

        if (data.performances && Array.isArray(data.performances)) {
          data.performances.forEach((perf: any) => {
            if (perf.actor && perf.movie) {
              const key = `${perf.actor.name}:${perf.movie.title}`
              newPerformanceData.set(key, {
                actorSlug: perf.actor.slug || perf.actorId,
                movieSlug: perf.movie.slug || perf.movieId,
                averageRating: perf.averageRating || 0,
                ratingCount: perf.ratingCount || 0,
              })
            }
          })
        }

        setPerformanceData(newPerformanceData)
      } catch (error) {
        console.error('Error fetching performance data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPerformanceData()
  }, [])

  if (isLoading) {
    return (
      <HomeLayout>
        <div className="min-h-screen bg-black flex items-center justify-center">
          <BouncingBallsLoader 
            size="lg" 
            color="#FFD700"
            showText={true}
            text="Loading Oscar nominees..."
          />
        </div>
      </HomeLayout>
    )
  }

  return (
    <HomeLayout>
      <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <div className="relative pt-20 sm:pt-24 md:pt-28 pb-20 px-4">
        <div className="relative max-w-6xl mx-auto text-center">
          {/* Oscar Trophy Icon */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="inline-flex items-center justify-center w-20 h-20 mb-8 rounded-full bg-gradient-to-br from-[#FFD700]/25 to-[#FFA500]/15 border-2 border-[#FFD700]/40"
          >
            <FaTrophy className="w-10 h-10 text-[#FFD700]" />
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6"
            style={{ fontFamily: 'var(--font-cinzel), serif' }}
          >
            <span className="text-white">Academy Awards</span>{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              2026
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl sm:text-2xl text-[#d4d4d8] font-light mb-4"
          >
            Oscar nominations are out. Rate the performances.
          </motion.p>

          {/* Gold divider */}
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="w-32 h-[2px] mx-auto"
            style={{
              background: 'linear-gradient(90deg, transparent, #FFD700, transparent)',
            }}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="max-w-6xl mx-auto px-4 pb-32">
        <div className="space-y-16">
          {OSCAR_CATEGORIES.map((category, categoryIndex) => (
            <motion.div
              key={category.category}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
            >
              {/* Category Title */}
              <h2
                className="text-3xl sm:text-4xl font-bold mb-8 text-center"
                style={{ fontFamily: 'var(--font-cinzel), serif' }}
              >
                {category.category}
              </h2>

              {/* Nominees List */}
              <div className="space-y-4 max-w-3xl mx-auto">
                {category.nominees.map((nominee, nomIndex) => {
                  const key = `${nominee.name}:${nominee.film}`
                  const perfData = performanceData.get(key)
                  const hasData = perfData && perfData.ratingCount > 0
                  const isThisLoading = loadingNominee === key
                  
                  // Create slug-friendly versions for URL
                  const actorSlug = perfData?.actorSlug || nominee.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                  const movieSlug = perfData?.movieSlug || nominee.film.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                  const href = `/rate/${movieSlug}/${actorSlug}`

                  const handleClick = (e: React.MouseEvent) => {
                    e.preventDefault()
                    setLoadingNominee(key)
                    // Small delay to show loading state, then navigate
                    setTimeout(() => {
                      router.push(href)
                    }, 50)
                  }

                  return (
                    <motion.div
                      key={nomIndex}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: nomIndex * 0.1 }}
                    >
                      <div
                        onClick={handleClick}
                        className="group relative p-6 rounded-2xl border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-xl transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,215,0,0.15)] cursor-pointer"
                        style={{
                          boxShadow: `
                            0 10px 30px -10px rgba(0, 0, 0, 0.8),
                            0 0 0 1px rgba(255, 255, 255, 0.05),
                            inset 0 1px 0 0 rgba(255, 255, 255, 0.08)
                          `,
                        }}
                      >
                        {/* Loading overlay */}
                        {isThisLoading && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                            <div className="flex items-center gap-3">
                              <div className="w-5 h-5 border-2 border-[#FFD700] border-t-transparent rounded-full animate-spin" />
                              <span className="text-[#FFD700] font-semibold">Loading...</span>
                            </div>
                          </div>
                        )}
                        <div>
                          {/* Row 1: Name with Badge */}
                          <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                            <h3 className="text-xl sm:text-2xl font-bold text-white break-words">
                              {nominee.name}
                            </h3>
                            {/* Oscar Nominee Badge */}
                            <span className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/15 border border-[#FFD700]/40">
                              <FaTrophy className="w-3 h-3 text-[#FFD700]" />
                              <span className="text-xs font-semibold text-[#FFD700]">
                                Nominee
                              </span>
                            </span>
                          </div>

                          {/* Row 2: Movie name directly under actor name */}
                          <p className="text-lg sm:text-xl text-[#FFD700] font-medium mb-3 break-words">
                            {nominee.film}
                          </p>

                          {/* Row 3: Score bubble (left) and Rate button (right) - same row */}
                          <div className="flex items-center justify-between gap-4 mb-2">
                            {/* Score bubble on left */}
                            {hasData && (
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 border border-[#FFD700]/30">
                                  <FaStar className="w-5 h-5 text-[#FFD700]" />
                                  <span className="text-lg sm:text-xl font-bold text-[#FFD700]">
                                    {(perfData.averageRating / 10).toFixed(1)}
                                  </span>
                                </div>
                                <span className="text-xs sm:text-sm text-[#71717a]">
                                  {perfData.ratingCount} {perfData.ratingCount === 1 ? 'rating' : 'ratings'}
                                </span>
                              </div>
                            )}
                            {/* Rate button on right */}
                            <button
                              disabled={isThisLoading}
                              className="px-8 sm:px-10 py-3 sm:py-3.5 rounded-full text-black text-base sm:text-lg font-bold transition-all duration-200 hover:scale-105 disabled:opacity-70 disabled:cursor-wait flex items-center gap-2 whitespace-nowrap ml-auto"
                              style={{
                                background: 'linear-gradient(135deg, #FFE55C, #FFD700)',
                              }}
                            >
                              {isThisLoading ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                                  <span>Loading...</span>
                                </>
                              ) : (
                                hasData ? 'Rate' : 'Rate First'
                              )}
                            </button>
                          </div>

                          {/* Row 4: Character if available */}
                          {nominee.character && (
                            <p className="text-sm sm:text-base text-[#a1a1aa] break-words">
                              as {nominee.character}
                            </p>
                          )}
                        </div>

                        {/* Decorative accent */}
                        <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-[#FFD700]/5 to-transparent rounded-tl-[60px] pointer-events-none" />
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
    </HomeLayout>
  )
}
