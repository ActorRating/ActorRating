"use client"

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Star, Calendar, User } from 'lucide-react'
import { Performance } from '@/types'
import { calculateOverallScore, getScoreLevel, DEFAULT_WEIGHTS } from '@/utils/ratingCalculator'
import { Button } from './ui/Button'
import { resolveCharacterDisplay } from '@/lib/character'

interface PerformanceCardProps {
  performance: Performance
  showUser?: boolean
  className?: string
}

export function PerformanceCard({ performance, showUser = false, className = '' }: PerformanceCardProps) {
  // Convert legacy performance data to Oscar criteria format
  const oscarCriteria = {
    technicalSkill: performance.technicalSkill,
    emotionalDepth: performance.emotionalRangeDepth,
    characterTransformation: performance.characterBelievability,
    storyImpact: performance.screenPresence,
    difficultyFactor: performance.chemistryInteraction,
  }

  const overallScore = calculateOverallScore(oscarCriteria, DEFAULT_WEIGHTS)
  const scoreLevel = getScoreLevel(overallScore)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`bg-secondary rounded-2xl border border-border p-6 hover:border-primary transition-all duration-300 group ${className}`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1 group-hover:text-primary transition-colors">
            {performance.actor?.name}
          </h3>
          <p className="text-muted-foreground mb-2">
            in &quot;{performance.movie?.title}&quot; as {resolveCharacterDisplay({ character: (performance as any).character, roleName: performance.roleName as any, comment: performance.comment as any })}
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              <span>{performance.movie?.year}</span>
            </div>
            {performance.movie?.director && (
              <span>Dir. {performance.movie.director}</span>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <div 
            className="text-2xl font-bold"
            style={{ color: scoreLevel.color }}
          >
            {overallScore}
          </div>
          <div className="text-sm text-muted-foreground">
            {scoreLevel.level}
          </div>
        </div>
      </div>

      {/* Oscar Criteria breakdown */}
      <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Technical Skill:</span>
          <span className="font-medium">{oscarCriteria.technicalSkill}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Emotional Depth:</span>
          <span className="font-medium">{oscarCriteria.emotionalDepth}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Character Transform:</span>
          <span className="font-medium">{oscarCriteria.characterTransformation}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Story Impact:</span>
          <span className="font-medium">{oscarCriteria.storyImpact}</span>
        </div>
        <div className="flex justify-between col-span-2">
          <span className="text-muted-foreground">Difficulty Factor:</span>
          <span className="font-medium">{oscarCriteria.difficultyFactor}</span>
        </div>
      </div>

      {performance.comment && (
        <div className="mb-4 p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground italic">
            &quot;{performance.comment}&quot;
          </p>
        </div>
      )}

      {showUser && performance.user?.name && (
        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
          <User className="w-4 h-4" />
          <span>Rated by {performance.user.name}</span>
        </div>
      )}

      <div className="flex gap-2">
        <Button
          asChild
          variant="premium"
          size="sm"
          className="flex-1"
        >
          <Link href={`/performances/${performance.id}`}>
            View Details
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          size="sm"
        >
          <Link href={`/rate/${performance.actorId}/${performance.movieId}`}>
            Rate This
          </Link>
        </Button>
      </div>
    </motion.div>
  )
} 