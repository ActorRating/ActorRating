"use client"

import { motion } from 'framer-motion'
import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { getRateUrl } from '@/lib/slugHelper'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { FaStar } from 'react-icons/fa'

interface FeaturedPerformance {
  actorName: string
  actorId: string
  movieTitle: string
  movieId: string
  character: string
  year: number
}

const FEATURED_PERFORMANCES: FeaturedPerformance[] = [
  {
    actorName: 'Heath Ledger',
    actorId: 'heath-ledger',
    movieTitle: 'The Dark Knight',
    movieId: 'the-dark-knight',
    character: 'The Joker',
    year: 2008
  },
  {
    actorName: 'Cillian Murphy',
    actorId: 'cillian-murphy',
    movieTitle: 'Oppenheimer',
    movieId: 'oppenheimer',
    character: 'J. Robert Oppenheimer',
    year: 2023
  },
  {
    actorName: 'Timothée Chalamet',
    actorId: 'timothee-chalamet',
    movieTitle: 'Dune',
    movieId: 'dune',
    character: 'Paul Atreides',
    year: 2021
  }
]

export function FeaturedPerformancesCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scrollToIndex = (index: number) => {
    if (scrollContainerRef.current) {
      const cardWidth = scrollContainerRef.current.offsetWidth
      scrollContainerRef.current.scrollTo({
        left: index * cardWidth,
        behavior: 'smooth'
      })
      setCurrentIndex(index)
    }
  }

  const nextCard = () => {
    const nextIndex = (currentIndex + 1) % FEATURED_PERFORMANCES.length
    scrollToIndex(nextIndex)
  }

  const prevCard = () => {
    const prevIndex = (currentIndex - 1 + FEATURED_PERFORMANCES.length) % FEATURED_PERFORMANCES.length
    scrollToIndex(prevIndex)
  }

  // Auto-scroll on desktop (optional, can be removed if not desired)
  useEffect(() => {
    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % FEATURED_PERFORMANCES.length
      scrollToIndex(nextIndex)
    }, 5000) // Change card every 5 seconds
    return () => clearInterval(interval)
  }, [currentIndex])

  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-12" aria-label="Featured performances">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        <h2 
          className="text-3xl sm:text-4xl md:text-5xl font-bold text-center sm:text-left"
          style={{ 
            fontFamily: 'var(--font-cinzel), serif',
            letterSpacing: '0.02em',
          }}
        >
          <span className="text-white">Start </span>
          <span 
            style={{
              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            Rating
          </span>
        </h2>
      </motion.div>

      <div className="relative -mx-4 sm:-mx-0">
        {/* Desktop: Fade edges - Same as performances page */}
        <div 
          className="overflow-hidden"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 80px, black calc(100% - 80px), transparent 100%)',
          }}
        >
          {/* Carousel Container - Same as performances page */}
          <div
            ref={scrollContainerRef}
            className="recent-scroll-container flex gap-8 overflow-x-auto pb-8 pt-4 snap-x snap-mandatory scrollbar-hide pl-[calc(50vw-42.5vw)] pr-[calc(50vw-42.5vw)] sm:pl-[calc(50vw-35vw)] sm:pr-[calc(50vw-35vw)] lg:px-[20vw] xl:px-[25vw]"
          >
          {FEATURED_PERFORMANCES.map((performance, index) => {
            const rateUrl = getRateUrl(
              { id: performance.actorId, name: performance.actorName, slug: performance.actorId },
              { id: performance.movieId, title: performance.movieTitle, year: performance.year, slug: performance.movieId }
            )

            return (
              <motion.div
                key={performance.actorId + performance.movieId}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex-shrink-0 w-[85vw] sm:w-[70vw] lg:w-[35vw] xl:w-[30vw] snap-center group"
              >
                <Link href={rateUrl} className="block h-full">
                  {/* Premium Card - Clean & Cinematic - Matching actor pages */}
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
                          {/* Score Pill - Top Left */}
                          <div className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/15 border border-[#FFD700]/40">
                            <FaStar className="w-5 h-5 text-[#FFD700]" />
                            <span className="text-2xl font-bold text-[#FFD700]">
                              N/A
                            </span>
                          </div>
                          
                          {/* Movie Year - Top Right */}
                          <div className="text-[#a3a3a3] text-base font-medium">
                            {performance.year}
                          </div>
                        </div>

                        {/* Movie Title */}
                        <div className="mb-4">
                          <span className="text-lg text-[#FFD700] font-semibold tracking-wide">
                            {performance.movieTitle}
                          </span>
                        </div>

                        {/* Character */}
                        <div className="mb-6">
                          <p className="text-lg sm:text-xl text-[#e4e4e7] leading-relaxed italic font-light">
                            as {performance.character}
                          </p>
                        </div>
                      </div>

                      {/* Rate Button */}
                      <div className="mt-auto pt-4">
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
                      </div>
                    </div>

                    {/* Decorative accent */}
                    <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-[#FFD700]/5 to-transparent rounded-tr-[80px]" />
                  </div>
                </Link>
              </motion.div>
            )
          })}
        </div>

        {/* Navigation Arrows - Desktop Only */}
        <div className="hidden lg:flex items-center justify-between absolute top-1/2 -translate-y-1/2 left-0 right-0 pointer-events-none">
          <button
            onClick={prevCard}
            className="pointer-events-auto w-12 h-12 rounded-full bg-[#1a1a1a]/80 backdrop-blur-sm border border-white/10 hover:border-[#FFD700]/50 flex items-center justify-center transition-all duration-200 hover:scale-110"
            aria-label="Previous performance"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <button
            onClick={nextCard}
            className="pointer-events-auto w-12 h-12 rounded-full bg-[#1a1a1a]/80 backdrop-blur-sm border border-white/10 hover:border-[#FFD700]/50 flex items-center justify-center transition-all duration-200 hover:scale-110"
            aria-label="Next performance"
          >
            <ArrowRight className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Dots Indicator - Same as performances page */}
        <div className="flex justify-center gap-2 mt-6 performance-carousel-dots">
          {FEATURED_PERFORMANCES.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToIndex(index)}
              className={`performance-dot ${
                index === currentIndex ? 'performance-dot-active' : 'performance-dot-inactive'
              }`}
              aria-label={`Go to performance ${index + 1}`}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
