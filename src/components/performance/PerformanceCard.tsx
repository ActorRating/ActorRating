"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React from 'react'
import { motion } from 'framer-motion'
import { Star, User, Award, TrendingUp, Eye, Pencil } from 'lucide-react'
import { Performance } from '@/types'
import { calculateOverallScore, getScoreLevel, DEFAULT_WEIGHTS } from '@/utils/ratingCalculator'
import { Button } from '../ui/Button'
import { resolveCharacterDisplay } from '@/lib/character'
import { fadeInUp, getMotionProps, scaleIn } from '@/lib/animations'
import { getActorUrl, getRateUrl } from '@/lib/slugHelper'

interface PerformanceCardProps {
  performance: Performance
  showUser?: boolean
  className?: string
  variant?: 'default' | 'featured' | 'compact'
  ratingCount?: number
  averageRating?: number
  confidenceLevel?: 'low' | 'medium' | 'high'
  oscarStatus?: 'nominated' | 'won' | null
  performanceType?: 'lead' | 'supporting'
  genres?: string[]
  onClick?: () => void
  ratingId?: string // For edit functionality
  showEditButton?: boolean // Show edit button for user's own ratings
}

export function PerformanceCard({ 
  performance, 
  showUser = false, 
  className = '',
  variant = 'default',
  ratingCount = 0,
  averageRating,
  confidenceLevel = 'medium',
  oscarStatus = null,
  performanceType = 'lead',
  genres = [],
  onClick,
  ratingId,
  showEditButton = false
}: PerformanceCardProps) {
  const router = useRouter()
  const cardRef = React.useRef<HTMLDivElement | null>(null)
  const prefetchedRef = React.useRef(false)

  // Generate URLs - will use slugs if available, otherwise IDs
  // Generate URLs using slug helpers
  const actorUrl = performance.actor && performance.actorId 
    ? getActorUrl({ id: performance.actorId, name: performance.actor.name, slug: (performance.actor as any).slug })
    : null
  
  const rateUrl = performance.actor && performance.movie
    ? getRateUrl(
        { id: performance.actorId, name: performance.actor.name, slug: (performance.actor as any).slug },
        { id: performance.movieId, title: performance.movie.title, year: performance.movie.year, slug: (performance.movie as any).slug }
      )
    : `/rate?actor=${performance.actorId}&movie=${performance.movieId}`
  
  // Edit URL with rating ID
  const editUrl = ratingId 
    ? `/rate?actor=${performance.actorId}&movie=${performance.movieId}&rating=${ratingId}`
    : rateUrl

  const prefetchTargets = React.useCallback(() => {
    if (prefetchedRef.current) return
    prefetchedRef.current = true
    const doPrefetch = () => {
      try {
        const r: any = router as any
        if (typeof r.prefetch === 'function') {
          r.prefetch(rateUrl)
          if (actorUrl) r.prefetch(actorUrl)
        }
      } catch {}
    }
    // Avoid main-thread contention: idle or timeout
    const ric: any = (typeof (globalThis as any).requestIdleCallback === 'function'
      ? (globalThis as any).requestIdleCallback
      : (cb: any) => setTimeout(cb, 0))
    ric(() => {
      try {
        const conn = (navigator as any).connection
        const saveData = !!conn?.saveData
        const slow = conn?.effectiveType && /^(2g|slow-2g)$/.test(conn.effectiveType)
        if (!saveData && !slow) doPrefetch()
      } catch {
        doPrefetch()
      }
    })
  }, [router, rateUrl, actorUrl])

  // Prefetch when card enters viewport
  React.useEffect(() => {
    if (!cardRef.current || prefetchedRef.current) return
    const el = cardRef.current
    const observer = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting) {
        prefetchTargets()
        observer.disconnect()
      }
    }, { rootMargin: '800px 0px 800px 0px' })
    observer.observe(el)
    return () => observer.disconnect()
  }, [prefetchTargets])
  // Convert legacy performance data to Oscar criteria format
  const oscarCriteria = {
    technicalSkill: performance.technicalSkill,
    emotionalDepth: performance.emotionalRangeDepth,
    characterTransformation: performance.characterBelievability,
    storyImpact: performance.screenPresence,
    difficultyFactor: performance.chemistryInteraction,
  }

  const overallScore = averageRating ?? calculateOverallScore(oscarCriteria, DEFAULT_WEIGHTS)
  const formattedScore = overallScore
  const scoreLevel = getScoreLevel(overallScore)

  const cardVariants = {
    default: "p-5 sm:p-6 lg:p-7 xl:p-8",
    featured: "p-6 sm:p-8 lg:p-10",
    compact: "p-5 sm:p-6 lg:p-6"
  }

  const titleVariants = {
    default: "text-xl sm:text-xl lg:text-xl",
    featured: "text-lg sm:text-xl lg:text-2xl",
    compact: "text-sm sm:text-base lg:text-lg"
  }

  const scoreVariants = {
    default: "text-xl sm:text-2xl lg:text-3xl",
    featured: "text-2xl sm:text-3xl lg:text-4xl",
    compact: "text-lg sm:text-xl lg:text-2xl"
  }

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-500'
      case 'medium': return 'text-yellow-500'
      case 'low': return 'text-red-500'
      default: return 'text-muted-foreground'
    }
  }

  const getOscarBadge = (status: string | null) => {
    if (!status) return null
    
    const badgeConfig = {
      nominated: { color: 'bg-blue-500', text: 'Oscar Nominee', icon: Award },
      won: { color: 'bg-yellow-500', text: 'Oscar Winner', icon: Award }
    }
    
    const config = badgeConfig[status as keyof typeof badgeConfig]
    if (!config) return null
    
    const Icon = config.icon
    
    return (
      <div className={`${config.color} text-white px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1`}>
        <Icon className="w-3 h-3" />
        {config.text}
      </div>
    )
  }

  return (
    <motion.div
      ref={cardRef}
      variants={fadeInUp}
      initial="hidden"
      animate="show"
      whileHover={{ y: -2, transition: { duration: 0.2, ease: 'easeOut' } }}
      className={`
        relative rounded-[2rem] border border-transparent
        transition-all duration-300 group cursor-pointer overflow-hidden
        h-full flex flex-col ${cardVariants[variant]} ${className}
      `}
      style={{
        background: 'linear-gradient(to bottom right, rgba(26, 26, 26, 0.95), rgba(15, 15, 15, 0.90), rgba(0, 0, 0, 0.95))',
        backdropFilter: 'blur(24px)',
        boxShadow: `
          0 25px 70px -15px rgba(0, 0, 0, 0.9),
          0 15px 40px -10px rgba(0, 0, 0, 0.7),
          0 0 0 1px rgba(255, 255, 255, 0.05),
          inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
          inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
        `,
      }}
       onMouseEnter={prefetchTargets}
       onFocus={prefetchTargets}
       onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Performance by ${performance.actor?.name} in ${performance.movie?.title}`}
    >
      {/* Header with badges */}
      <div className="flex flex-col gap-4 mb-4">
         {/* Top Row: Rating Badge and Year */}
         <div className="flex items-center justify-between pt-3 sm:pt-0">
           {averageRating !== undefined && averageRating !== null ? (
             <div className="relative inline-flex items-center gap-1.5 px-4 py-3 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/15 border border-[#FFD700]/40">
               {/* Edit Button - Outside Top Right of Score Bubble */}
               {showEditButton && ratingId && (
                 <Link
                   href={editUrl}
                   onClick={(e) => e.stopPropagation()}
                   className="absolute -top-2 -right-2 sm:top-0 sm:right-0 sm:translate-x-1/2 sm:-translate-y-1/2 z-10"
                 >
                   <button
                     className="w-11 h-11 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95 bg-[#1a1a1a] border border-white/10 hover:border-[#FFD700]/50 shadow-lg touch-manipulation"
                     style={{
                       boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                       minWidth: '44px',
                       minHeight: '44px',
                     }}
                     aria-label="Edit rating"
                   >
                     <Pencil className="w-5 h-5 sm:w-4 sm:h-4 text-[#FFD700]" />
                   </button>
                 </Link>
               )}
               <Star className="w-5 h-5 text-[#FFD700] fill-[#FFD700]" />
               <span className="text-2xl font-bold text-[#FFD700]">
                 {averageRating.toFixed(1)}
               </span>
             </div>
           ) : (
             <div className="relative inline-flex items-center gap-3 px-4 py-3 rounded-full bg-gradient-to-r from-[#1a1a1a]/80 to-[#0f0f0f]/80 border border-[#666]/40">
               <Star className="w-5 h-5 text-[#666]" />
               <span className="text-2xl font-bold text-[#a3a3a3]">N/A</span>
             </div>
           )}
          
          {/* Movie Year */}
          {performance.movie?.year && (
            <div className="text-base text-[#a1a1aa] font-medium">
              {performance.movie.year}
            </div>
          )}
        </div>

        {/* Actor Name and Movie Title - Centered */}
        <div className="text-center">
          <h3 
            className={`font-bold text-white mb-2 ${titleVariants[variant]} break-words`}
            style={{ fontFamily: 'var(--font-cinzel), serif' }}
          >
            {performance.actor?.name}
          </h3>
          
          {/* Movie Title */}
          <div className="mb-2">
            <span className="text-lg text-[#FFD700] font-semibold tracking-wide break-words inline-block">
              {performance.movie?.title}
            </span>
          </div>
          
          {/* Character */}
          {(() => {
            const character = resolveCharacterDisplay({ 
              character: (performance as any).character, 
              roleName: performance.roleName as any, 
              comment: performance.comment as any 
            })
            // Only show character if it's not "Unknown"
            if (character && character.toLowerCase() !== 'unknown') {
              return (
                <div className="mb-2">
                  <p className="text-lg sm:text-xl text-[#e4e4e7] leading-relaxed italic font-light break-words">
                    as {character}
                  </p>
                </div>
              )
            }
            return null
          })()}
        </div>
      </div>

      {/* Genre Tags */}
      {genres.length > 0 && variant !== 'compact' && (
        <div className="flex flex-wrap gap-1 mb-4">
          {genres.slice(0, 3).map((genre, index) => (
            <span 
              key={index}
              className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full"
            >
              {genre}
            </span>
          ))}
          {genres.length > 3 && (
            <span className="px-2 py-1 bg-muted text-muted-foreground text-xs rounded-full">
              +{genres.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Confidence Indicator removed as per request */}

      {/* User Info */}
      {showUser && performance.user?.name && (
        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
          <User className="w-4 h-4" />
          <span>Rated by {performance.user.name}</span>
        </div>
      )}

      {/* Comment Preview */}
      {performance.comment && variant !== 'compact' && (
        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
          <p className="text-sm text-muted-foreground italic line-clamp-2">
            &quot;{performance.comment}&quot;
          </p>
        </div>
      )}

      {/* Action Button (Rate only) - Hidden if user has already rated */}
      {!showEditButton && (
        <div className="flex mt-auto">
          <Button
            asChild
            variant="premium"
            size={variant === 'compact' ? 'sm' : 'md'}
            className="flex-1"
          >
            <Link href={rateUrl}>
              Rate This
            </Link>
          </Button>
        </div>
      )}
    </motion.div>
  )
} 