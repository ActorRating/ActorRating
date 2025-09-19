"use client"

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Star, Calendar, User, Award, TrendingUp, Eye, Play, Heart } from 'lucide-react'
import { Performance } from '@/types'
import { calculateOverallScore, getScoreLevel, DEFAULT_WEIGHTS } from '@/utils/ratingCalculator'
import { Button } from '../ui/Button'
import { RatingVisualization } from './RatingVisualization'
import { resolveCharacterDisplay } from '@/lib/character'

interface FeaturedPerformanceCardProps {
  performance: Performance
  showUser?: boolean
  className?: string
  ratingCount?: number
  averageRating?: number
  confidenceLevel?: 'low' | 'medium' | 'high'
  oscarStatus?: 'nominated' | 'won' | null
  performanceType?: 'lead' | 'supporting'
  genres?: string[]
  featuredBadge?: string
  onClick?: () => void
}

export function FeaturedPerformanceCard({ 
  performance, 
  showUser = false, 
  className = '',
  ratingCount = 0,
  averageRating,
  confidenceLevel = 'medium',
  oscarStatus = null,
  performanceType = 'lead',
  genres = [],
  featuredBadge = 'Featured',
  onClick
}: FeaturedPerformanceCardProps) {
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
      <div className={`${config.color} text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2`}>
        <Icon className="w-4 h-4" />
        {config.text}
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      whileHover={{ 
        y: -6,
        transition: { duration: 0.3 }
      }}
      className={`
        bg-gradient-to-br from-card to-card/80 rounded-3xl border border-border/50 
        shadow-xl hover:shadow-2xl transition-all duration-500 group cursor-pointer 
        overflow-hidden relative p-8 ${className}
      `}
      onClick={onClick}
      role="button"
      tabIndex={0}
      aria-label={`Featured performance by ${performance.actor?.name} in ${performance.movie?.title}`}
    >
      {/* Featured Badge */}
      <div className="absolute top-4 right-4 z-10">
        <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 shadow-lg">
          <Heart className="w-4 h-4" />
          {featuredBadge}
        </div>
      </div>

      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5 opacity-50" />
      
      <div className="relative z-10">
        {/* Header Section */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-3">
              <h2 className="text-2xl font-bold text-foreground group-hover:text-primary transition-colors truncate">
                {performance.actor?.name}
              </h2>
              {oscarStatus && getOscarBadge(oscarStatus)}
            </div>
            
            <h3 className="text-xl text-muted-foreground font-semibold mb-2">
              in &quot;{performance.movie?.title}&quot;
              {performance.movie?.year && (
                <span className="text-muted-foreground/70 ml-2">({performance.movie.year})</span>
              )}
              <span className="ml-2 text-muted-foreground/90">as {resolveCharacterDisplay({ character: (performance as any).character, roleName: performance.roleName as any, comment: performance.comment as any })}</span>
              {performance.comment ? ` ${performance.comment}` : ''}
            </h3>
            
            {performance.movie?.director && (
              <p className="text-muted-foreground mb-3">
                Directed by {performance.movie.director}
              </p>
            )}
            
            <div className="flex items-center gap-3 text-sm text-muted-foreground mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{performance.movie?.year}</span>
              </div>
              {performanceType && (
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  performanceType === 'lead' 
                    ? 'bg-primary/15 text-primary' 
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {performanceType === 'lead' ? 'Lead Role' : 'Supporting Role'}
                </span>
              )}
            </div>
          </div>
          
          {/* Prominent Rating Score */}
          <div className="text-right ml-6">
            {ratingCount > 0 ? (
              <>
                <div 
                  className="text-4xl font-bold mb-1"
                  style={{ color: scoreLevel.color }}
                >
                  {overallScore.toFixed(1)}
                </div>
                <div className="text-lg text-muted-foreground mb-2">
                  {scoreLevel.level}
                </div>
                <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
                  <Star className="w-4 h-4 fill-current" />
                  <span>{ratingCount} ratings</span>
                </div>
              </>
            ) : (
              <div className="text-base text-muted-foreground">N/A</div>
            )}
          </div>
        </div>

        {/* Enhanced Rating Visualization */}
        <div className="mb-6">
          <RatingVisualization 
            criteria={oscarCriteria}
            size="large"
            showLabels={true}
          />
        </div>

        {/* Genre Tags */}
        {genres.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-6">
            {genres.slice(0, 4).map((genre, index) => (
              <span 
                key={index}
                className="px-3 py-1 bg-muted/50 text-muted-foreground text-sm rounded-full border border-border/50"
              >
                {genre}
              </span>
            ))}
            {genres.length > 4 && (
              <span className="px-3 py-1 bg-muted/50 text-muted-foreground text-sm rounded-full border border-border/50">
                +{genres.length - 4} more
              </span>
            )}
          </div>
        )}

        {/* Confidence and User Info */}
        <div className="flex items-center justify-between mb-6">
          {confidenceLevel && ratingCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className={`w-4 h-4 ${getConfidenceColor(confidenceLevel)}`} />
              <span className={getConfidenceColor(confidenceLevel)}>
                {confidenceLevel === 'high' ? 'High confidence' : 
                 confidenceLevel === 'medium' ? 'Medium confidence' : 'Low confidence'}
              </span>
            </div>
          )}
          
          {showUser && performance.user?.name && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>Rated by {performance.user.name}</span>
            </div>
          )}
        </div>

        {/* Comment Preview */}
        {performance.comment && (
          <div className="mb-6 p-4 bg-muted/30 rounded-xl border border-border/30">
            <p className="text-base text-muted-foreground italic leading-relaxed">
              &quot;{performance.comment}&quot;
            </p>
          </div>
        )}

        {/* Single Action Button: Rate */}
        <div className="flex gap-3">
          <Button
            asChild
            variant="premium"
            size="lg"
            className="flex-1 text-base font-semibold"
          >
            <Link href={`/rate?actor=${performance.actorId}&movie=${performance.movieId}`}>
              <Play className="w-5 h-5 mr-2" />
              {ratingCount > 0 ? 'Rate This' : 'Be the first to rate'}
            </Link>
          </Button>
        </div>
      </div>
    </motion.div>
  )
} 