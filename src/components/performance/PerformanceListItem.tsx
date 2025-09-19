"use client"

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Star, Calendar, User, Award, Eye, Play } from 'lucide-react'
import { Performance } from '@/types'
import { calculateOverallScore, getScoreLevel, DEFAULT_WEIGHTS } from '@/utils/ratingCalculator'
import { Button } from '../ui/Button'
import { fadeInUp, getMotionProps } from '@/lib/animations'
import { resolveCharacterDisplay } from '@/lib/character'

interface PerformanceListItemProps {
  performance: Performance
  showUser?: boolean
  className?: string
  ratingCount?: number
  averageRating?: number
  oscarStatus?: 'nominated' | 'won' | null
  performanceType?: 'lead' | 'supporting'
  onClick?: () => void
}

export function PerformanceListItem({ 
  performance, 
  showUser = false, 
  className = '',
  ratingCount = 0,
  averageRating,
  oscarStatus = null,
  performanceType = 'lead',
  onClick
}: PerformanceListItemProps) {
  // Convert legacy performance data to Oscar criteria format
  const oscarCriteria = {
    technicalSkill: performance.technicalSkill,
    emotionalDepth: performance.emotionalRangeDepth,
    characterTransformation: performance.characterBelievability,
    storyImpact: performance.screenPresence,
    difficultyFactor: performance.chemistryInteraction,
  }

  const overallScore = averageRating || calculateOverallScore(oscarCriteria, DEFAULT_WEIGHTS)
  const scoreLevel = getScoreLevel(overallScore)

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
      variants={fadeInUp}
      {...getMotionProps()}
      whileHover={{ x: 4, transition: { duration: 0.2, ease: 'easeOut' } }}
      className={`
        bg-card rounded-xl border border-border shadow-sm hover:shadow-md 
        transition-all duration-200 group cursor-pointer overflow-hidden
        p-5 sm:p-4 ${className}
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Performance by ${performance.actor?.name} in ${performance.movie?.title}`}
    >
      <div className="flex items-center gap-4">
        {/* Actor and Movie Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors truncate">
              {performance.actor?.name}
            </h3>
            {oscarStatus && getOscarBadge(oscarStatus)}
          </div>
          
          <p className="text-sm text-muted-foreground mb-1 truncate">
            in &quot;{performance.movie?.title}&quot; as {resolveCharacterDisplay({ character: (performance as any).character, roleName: performance.roleName as any, comment: performance.comment as any })}
            {performance.movie?.year && (
              <span className="text-muted-foreground/70 ml-1">({performance.movie.year})</span>
            )}
          </p>
          
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{performance.movie?.year}</span>
            </div>
            {performanceType && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${
                performanceType === 'lead' 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                {performanceType === 'lead' ? 'Lead' : 'Supporting'}
              </span>
            )}
            {performance.movie?.director && (
              <span className="truncate">Dir. {performance.movie.director}</span>
            )}
          </div>
        </div>
        
        {/* Rating Score */}
        <div className="text-right flex-shrink-0">
          {ratingCount > 0 ? (
            <>
              <div 
                className="text-xl font-bold"
                style={{ color: scoreLevel.color }}
              >
                {overallScore.toFixed(1)}
              </div>
              <div className="text-xs text-muted-foreground">
                {scoreLevel.level}
              </div>
              <div className="flex items-center justify-end gap-1 text-xs text-muted-foreground mt-1">
                <Star className="w-3 h-3 fill-current" />
                <span>{ratingCount}</span>
              </div>
            </>
          ) : (
            <div className="text-xs text-muted-foreground">N/A</div>
          )}
        </div>
        
        {/* User Info */}
        {showUser && performance.user?.name && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground flex-shrink-0">
            <User className="w-3 h-3" />
            <span className="truncate max-w-20">{performance.user.name}</span>
          </div>
        )}
        
        {/* Action Button: Rate only */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            asChild
            variant="premium"
            size="sm"
          >
            <Link href={`/rate?actor=${performance.actorId}&movie=${performance.movieId}`}>
              <Play className="w-3 h-3" />
            </Link>
          </Button>
        </div>
      </div>
      
      {/* Comment Preview (if exists and short) */}
      {performance.comment && performance.comment.length < 100 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <p className="text-xs text-muted-foreground italic line-clamp-1">
            &quot;{performance.comment}&quot;
          </p>
        </div>
      )}
    </motion.div>
  )
} 