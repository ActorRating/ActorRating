"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, useMemo } from "react"
import { motion } from "framer-motion"
import { HomeLayout } from "@/components/layout"
import { SignedInLayout } from "@/components/layout/SignedInLayout"
import { useUser } from "@/components/providers/SessionProvider"
import { FaStar } from "react-icons/fa"
import Link from "next/link"

interface Performance {
  id: string
  actorId: string
  movieId: string
  actor: {
    id: string
    name: string
    imageUrl?: string
  }
  movie: {
    id: string
    title: string
    year: number
    director?: string
  }
  character?: string
  roleName?: string
  averageRating?: number
  ratingCount?: number
}

export default function PerformancesPage() {
  const user = useUser()
  const [allPerformances, setAllPerformances] = useState<Performance[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    
    const fetchPerformances = async () => {
      try {
        const response = await fetch('/api/performances')
        if (response.ok && !cancelled) {
          const data = await response.json()
          
          // Filter for valid performances only
          const validData = Array.isArray(data) 
            ? data.filter((p: any) => 
                p.actorId && 
                p.movieId && 
                p.actor?.id && 
                p.movie?.id &&
                p.actor?.name &&
                p.movie?.title
              )
            : []
          
          setAllPerformances(validData)
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch performances:", error)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchPerformances()
    
    return () => {
      cancelled = true
    }
  }, [])

  const { newPerformances, iconicPerformances } = useMemo(() => {
    // Filter for recent performances (2023-2025)
    const recentPerformances = allPerformances.filter(p => 
      p.movie.year >= 2023 && p.movie.year <= 2025
    )

    // Deduplicate by actor-movie pair AND prioritize diversity (one performance per actor)
    const seenRecent = new Set<string>()
    const seenActors = new Set<string>()
    const diverseRecent: Performance[] = []
    
    // First pass: get one performance per actor
    for (const p of recentPerformances) {
      const key = `${p.actorId}-${p.movieId}`
      if (!seenRecent.has(key) && !seenActors.has(p.actorId)) {
        seenRecent.add(key)
        seenActors.add(p.actorId)
        diverseRecent.push(p)
        if (diverseRecent.length >= 6) break
      }
    }
    
    // If we don't have enough, add more from same actors
    if (diverseRecent.length < 6) {
      for (const p of recentPerformances) {
        const key = `${p.actorId}-${p.movieId}`
        if (!seenRecent.has(key)) {
          seenRecent.add(key)
          diverseRecent.push(p)
          if (diverseRecent.length >= 6) break
        }
      }
    }
    
    const uniqueRecent = diverseRecent

    // Define iconic performances to search for in database
    const iconicNames = [
      { actor: "Heath Ledger", movie: "The Dark Knight" },
      { actor: "Marlon Brando", movie: "The Godfather" },
      { actor: "Daniel Day-Lewis", movie: "There Will Be Blood" },
      { actor: "Al Pacino", movie: "The Godfather Part II" },
      { actor: "Anthony Hopkins", movie: "The Silence of the Lambs" },
      { actor: "Viola Davis", movie: "Fences" },
      { actor: "Cate Blanchett", movie: "Blue Jasmine" },
      { actor: "Frances McDormand", movie: "Three Billboards Outside Ebbing, Missouri" },
      { actor: "Meryl Streep", movie: "The Iron Lady" },
      { actor: "Vivien Leigh", movie: "Gone with the Wind" }
    ]

    // Find matching performances from database
    const iconicMatches: Performance[] = []
    for (const iconic of iconicNames) {
      const found = allPerformances.find(p => 
        p.actor.name.toLowerCase().trim() === iconic.actor.toLowerCase().trim() &&
        p.movie.title.toLowerCase().trim() === iconic.movie.toLowerCase().trim()
      )
      if (found) {
        iconicMatches.push(found)
      }
    }

    // Deduplicate iconic performances
    const seenIconic = new Set<string>()
    const uniqueIconic = iconicMatches.filter(p => {
      const key = `${p.actorId}-${p.movieId}`
      if (seenIconic.has(key)) return false
      seenIconic.add(key)
      return true
    }).slice(0, 6)

    return {
      newPerformances: uniqueRecent,
      iconicPerformances: uniqueIconic
    }
  }, [allPerformances])

  const LayoutWrapper = user ? SignedInLayout : HomeLayout

  return (
    <LayoutWrapper>
      <div className="relative z-10 bg-black py-32 sm:py-40 md:py-48 lg:py-60" style={{ willChange: 'auto' }}>
        {/* Background ambient glow */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#FFC800]/20 rounded-full blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#FFB000]/15 rounded-full blur-[150px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 relative">
          <div className="grid grid-cols-12 gap-8">
            {/* Title (with gutters) */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3, margin: "0px 0px -100px 0px" }}
              transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
              style={{ willChange: 'transform, opacity' }}
              className="col-span-12 lg:col-start-2 lg:col-span-10 text-center mb-24 sm:mb-32 lg:mb-40"
            >
            <h2 
              className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-8 tracking-tight px-4 sm:px-0"
              style={{ fontFamily: 'var(--font-cinzel), serif' }}
            >
              Rate Performances
            </h2>
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              whileInView={{ width: "220px", opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
              style={{ willChange: 'width, opacity' }}
              className="h-1 bg-gradient-to-r from-transparent via-[#FFD700] to-transparent mx-auto shadow-[0_0_30px_rgba(255,215,0,0.6)] mb-8"
            />
              <p className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl text-[#e4e4e7] max-w-4xl mx-auto font-light leading-relaxed px-6 sm:px-4">
                Discover and rate the finest performances in cinema history
              </p>
            </motion.div>

            {/* New Performances Section (with gutters) */}
            <div className="col-span-12 lg:col-start-2 lg:col-span-10 mb-32 sm:mb-40 md:mb-48">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3, margin: "0px 0px -100px 0px" }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ willChange: 'transform, opacity' }}
                className="text-center mb-24 sm:mb-32 lg:mb-40"
              >
              <h3 
                className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 tracking-tight px-4 sm:px-0"
                style={{ fontFamily: 'var(--font-cinzel), serif' }}
              >
                New Performances
              </h3>
                <p className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl text-[#e4e4e7] max-w-4xl mx-auto font-light leading-relaxed px-6 sm:px-4">
                  Recent additions and popular current releases
                </p>
              </motion.div>

              {loading ? (
                <div className="grid grid-cols-12 gap-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="col-span-12 md:col-span-6 animate-pulse">
                      <div className="bg-[#1a1a1a]/80 rounded-3xl border border-[#FFD700]/10 p-8 h-96"></div>
                    </div>
                  ))}
                </div>
              ) : newPerformances.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {newPerformances.map((performance, index) => (
                    <div key={`new-${performance.actorId}-${performance.movieId}-${index}`}>
                      <PerformanceCard 
                        performance={performance} 
                        index={index} 
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 px-4">
                  <p className="text-xl sm:text-2xl text-[#a3a3a3]">No recent performances found. Check back soon!</p>
                </div>
              )}
            </div>

            {/* Iconic Performances Section (with gutters) */}
            <div className="col-span-12 lg:col-start-2 lg:col-span-10 mb-16 sm:mb-20">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3, margin: "0px 0px -100px 0px" }}
                transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                style={{ willChange: 'transform, opacity' }}
                className="text-center mb-24 sm:mb-32 lg:mb-40"
              >
              <h3 
                className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold text-white mb-6 tracking-tight px-4 sm:px-0"
                style={{ fontFamily: 'var(--font-cinzel), serif' }}
              >
                Iconic Performances
              </h3>
                <p className="text-base xs:text-lg sm:text-xl md:text-2xl lg:text-3xl text-[#e4e4e7] max-w-4xl mx-auto font-light leading-relaxed px-6 sm:px-4">
                  Legendary performances that defined cinema
                </p>
              </motion.div>

              {iconicPerformances.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {iconicPerformances.map((performance, index) => (
                    <div key={`iconic-${performance.actorId}-${performance.movieId}-${index}`}>
                      <PerformanceCard 
                        performance={performance} 
                        index={index} 
                        isIconic 
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 px-4">
                  <p className="text-xl sm:text-2xl text-[#a3a3a3]">Iconic performances will appear here once added to the database.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </LayoutWrapper>
  )
}

function PerformanceCard({ 
  performance, 
  index, 
  isIconic = false 
}: { 
  performance: Performance
  index: number
  isIconic?: boolean 
}) {
  // Use actorId and movieId directly from performance object
  const actorId = performance.actorId
  const movieId = performance.movieId
  
  // Safety check - should never happen due to filtering, but defensive programming
  if (!actorId || !movieId) {
    console.warn('Performance card received invalid IDs:', { actorId, movieId, performance })
    return null
  }
  
  const rateUrl = `/rate?actor=${actorId}&movie=${movieId}`

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -50px 0px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ willChange: 'transform, opacity' }}
      className="group relative"
    >
      {/* Premium Card - EXACT match to landing page */}
      <div className="relative h-full p-8 sm:p-10 md:p-12 rounded-3xl border border-[#FFD700]/25 bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden transition-all duration-700 hover:border-[#FFD700]/60 hover:shadow-[0_0_100px_rgba(255,215,0,0.25)] hover:-translate-y-2">
        {/* Glow effect */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFD700]/10 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex-1">
            {/* Rating Badge or Iconic Badge */}
            <div className="flex items-center justify-between mb-6">
              {isIconic ? (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/15 border border-[#FFD700]/40">
                  <FaStar className="w-4 h-4 text-[#FFD700]" />
                  <span className="text-sm font-bold text-[#FFD700] tracking-widest uppercase">ICONIC</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/15 border border-[#FFD700]/40">
                  <FaStar className="w-4 h-4 text-[#FFD700]" />
                  <span className="text-sm font-bold text-[#FFD700] tracking-widest uppercase">NEW</span>
                </div>
              )}
              <span className="text-base text-[#a1a1aa] font-medium">{performance.movie.year}</span>
            </div>

            {/* Actor Name */}
            <h3 
              className="text-2xl sm:text-3xl font-bold text-white mb-2"
              style={{ fontFamily: 'var(--font-cinzel), serif' }}
            >
              {performance.actor.name}
            </h3>

            {/* Movie Title */}
            <div className="mb-4">
              <span className="text-lg text-[#FFD700] font-semibold tracking-wide">
                {performance.movie.title}
              </span>
            </div>

            {/* Character Name */}
            {(performance.roleName || performance.character) && (
              <div className="mb-6">
                <p className="text-lg sm:text-xl text-[#e4e4e7] leading-relaxed italic font-light">
                  <span className="text-[#FFD700]/60">"</span>
                  as {performance.roleName || performance.character}
                  <span className="text-[#FFD700]/60">"</span>
                </p>
              </div>
            )}
          </div>

          {/* Rate Button - Always at bottom */}
          <div className="mt-auto pt-4">
            <Link href={rateUrl}>
              <button 
                className="w-full px-8 py-4 rounded-full text-black text-base font-bold tracking-wider uppercase transition-all duration-500 hover:scale-105"
                style={{
                  background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                }}
              >
                <span className="flex items-center justify-center gap-2">
                  Rate Performance
                  <FaStar className="w-4 h-4" />
                </span>
              </button>
            </Link>
          </div>
        </div>

        {/* Decorative accent - EXACT match to landing page */}
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#FFD700]/5 to-transparent rounded-tr-[80px]" />
      </div>
    </motion.div>
  )
}
