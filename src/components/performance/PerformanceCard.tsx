"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import React from 'react'
import { motion } from 'framer-motion'
import { Star, User, Award, TrendingUp, Eye } from 'lucide-react'
import { Performance } from '@/types'
import { calculateOverallScore, getScoreLevel, DEFAULT_WEIGHTS } from '@/utils/ratingCalculator'
import { Button } from '../ui/Button'
import { RatingVisualization } from './RatingVisualization'
import { resolveCharacterDisplay } from '@/lib/character'
import { fadeInUp, getMotionProps, scaleIn } from '@/lib/animations'

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
  onClick
}: PerformanceCardProps) {
  const router = useRouter()
  const cardRef = React.useRef<HTMLDivElement | null>(null)
  const prefetchedRef = React.useRef(false)

  const rateUrl = `/rate?actor=${performance.actorId}&movie=${performance.movieId}`
  const actorUrl = performance.actorId ? `/actors/${performance.actorId}` : null
  const movieUrl = performance.movieId ? `/movies/${performance.movieId}` : null

  const prefetchTargets = React.useCallback(() => {
    if (prefetchedRef.current) return
    prefetchedRef.current = true
    const doPrefetch = () => {
      try {
        const r: any = router as any
        if (typeof r.prefetch === 'function') {
          r.prefetch(rateUrl)
          if (actorUrl) r.prefetch(actorUrl)
          if (movieUrl) r.prefetch(movieUrl)
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
  }, [router, rateUrl, actorUrl, movieUrl])

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
    default: "text-base sm:text-lg lg:text-xl",
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
        bg-card rounded-2xl border border-border shadow-sm hover:shadow-lg 
        transition-all duration-300 group cursor-pointer overflow-hidden
        h-full flex flex-col ${cardVariants[variant]} ${className}
      `}
       onMouseEnter={prefetchTargets}
       onFocus={prefetchTargets}
       onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Performance by ${performance.actor?.name} in ${performance.movie?.title}`}
    >
      {/* Header with badges */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className={`font-bold text-foreground group-hover:text-primary transition-colors truncate ${titleVariants[variant]}`}>
              {performance.actor?.name}
            </h3>
            {oscarStatus && getOscarBadge(oscarStatus)}
          </div>
          
          <p className="text-muted-foreground font-medium mb-1">
            in &quot;{performance.movie?.title}&quot;
            {performance.movie?.year && (
              <span className="text-muted-foreground/70 ml-1">({performance.movie.year})</span>
            )}
            <span className="ml-2 text-muted-foreground/90">as {resolveCharacterDisplay({ character: (performance as any).character, roleName: performance.roleName as any, comment: performance.comment as any })}</span>
            {performance.comment ? ` ${performance.comment}` : ''}
          </p>
          
          {performanceType && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <span className={`px-2 py-1 rounded-full ${
                performanceType === 'lead' 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {performanceType === 'lead' ? 'Lead' : 'Supporting'}
              </span>
            </div>
          )}
        </div>
        
        {/* Rating Score */}
        <div className="text-right ml-6 pr-1 flex flex-col items-end space-y-2">
          {ratingCount > 0 ? (
            <>
              <div 
                className={`font-bold ${scoreVariants[variant]}`}
                style={{ color: scoreLevel.color }}
              >
                {formattedScore.toFixed(1)}
              </div>
              <div className="text-sm text-white">
                {scoreLevel.level}
              </div>
              <div className="flex items-center gap-3 mt-2">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" aria-hidden="true" />
                <span className="px-3 py-1 rounded-full bg-muted text-white text-[10px] leading-none font-medium">
                  {ratingCount}
                </span>
              </div>
            </>
          ) : (
            <div className="text-sm sm:text-base text-muted-foreground">N/A</div>
          )}
        </div>
      </div>

      {/* Rating Visualization */}
      {variant !== 'compact' && (
        <div className="mb-4">
          <RatingVisualization 
            criteria={oscarCriteria}
            size={variant === 'featured' ? 'large' : 'medium'}
          />
        </div>
      )}

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

      {/* Action Button (Rate only) */}
      <div className="flex mt-auto">
        <Button
          asChild
          variant="premium"
          size={variant === 'compact' ? 'sm' : 'md'}
          className="flex-1"
        >
          <Link href={`/rate?actor=${performance.actorId}&movie=${performance.movieId}`}>
            {ratingCount > 0 ? 'Rate This' : 'Be the first to rate'}
          </Link>
        </Button>
      </div>
    </motion.div>
  )
} 