"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { motion } from "framer-motion"
import { staggerContainer, fadeInUp, getMotionProps } from "@/lib/animations"
import { 
  RatingDisplayProps,
  OverallScoreProps,
  CriteriaBreakdownProps,
  RatingComparisonProps,
  RatingHistoryProps,
  AverageRatingProps
} from "@/types/rating"
import { 
  getScoreLevel, 
  calculateOverallScore, 
  DEFAULT_WEIGHTS,
  calculateRatingStats 
} from "@/utils/ratingCalculator"

// Overall Score Component
export function OverallScore({ 
  score, 
  size = 'medium', 
  showLabel = true, 
  animated = false 
}: OverallScoreProps) {
  const scoreLevel = getScoreLevel(score)
  
  const sizeClasses = {
    small: "text-2xl font-bold w-16 h-16",
    medium: "text-4xl font-bold w-24 h-24",
    large: "text-6xl font-bold w-32 h-32"
  }
  
  const labelSizes = {
    small: "text-xs",
    medium: "text-sm",
    large: "text-base"
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={cn(
          "flex items-center justify-center rounded-full border-4 transition-all duration-300",
          sizeClasses[size],
          animated && "animate-pulse"
        )}
        style={{ 
          borderColor: scoreLevel.color,
          backgroundColor: `${scoreLevel.color}20`
        }}
        role="img"
        aria-label={`Overall score: ${score} out of 100, ${scoreLevel.level} quality`}
      >
        {score}
      </div>
      {showLabel && (
        <div className="text-center">
          <div 
            className={cn("font-semibold", labelSizes[size])}
            style={{ color: scoreLevel.color }}
          >
            {scoreLevel.level}
          </div>
          <div className={cn("text-muted-foreground", labelSizes[size])}>
            {scoreLevel.description}
          </div>
        </div>
      )}
    </div>
  )
}

// Criteria Breakdown Component
export function CriteriaBreakdown({ 
  criteria, 
  weights, 
  showWeights = true, 
  showScores = true 
}: CriteriaBreakdownProps) {
  const criteriaLabels = {
    technicalSkill: 'Technical Skill',
    emotionalDepth: 'Emotional Depth',
    characterTransformation: 'Character Transformation',
    storyImpact: 'Story Impact',
    difficultyFactor: 'Difficulty Factor'
  }

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-foreground">Criteria Breakdown</h3>
      <div className="space-y-2">
        {Object.entries(criteria).map(([key, value]) => {
          const criterion = key as keyof typeof criteria
          const weight = weights[criterion]
          const scoreLevel = getScoreLevel(value)
          
          return (
            <div key={key} className="flex items-center justify-between p-3 bg-secondary rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-foreground">
                    {criteriaLabels[criterion]}
                  </span>
                  {showWeights && (
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                      {Math.round(weight * 100)}%
                    </span>
                  )}
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${value}%`,
                      backgroundColor: scoreLevel.color
                    }}
                  />
                </div>
              </div>
              {showScores && (
                <div className="ml-4 text-right">
                  <div 
                    className="text-lg font-bold"
                    style={{ color: scoreLevel.color }}
                  >
                    {value}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {scoreLevel.level}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Rating Comparison Component
export function RatingComparison({ 
  userRating, 
  averageRating, 
  totalRatings 
}: RatingComparisonProps) {
  if (!averageRating || !totalRatings) {
    return (
      <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
        No comparison data available
      </div>
    )
  }

  const difference = userRating.overallScore - averageRating.overallScore
  const isHigher = difference > 0
  const isLower = difference < 0
  const isSame = difference === 0

  return (
    <div className="p-4 bg-secondary rounded-lg border border-border">
      <h3 className="text-lg font-semibold text-foreground mb-3">Rating Comparison</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">Your Rating</div>
          <div className="text-3xl font-bold">{userRating.overallScore}</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-muted-foreground">Average</div>
          <div className="text-3xl font-bold">{averageRating.overallScore}</div>
        </div>
      </div>

      <div className="text-center">
        {isSame ? (
          <div className="text-green-600 font-semibold">
            Your rating matches the average
          </div>
        ) : (
          <div className={cn(
            "font-semibold",
            isHigher ? "text-green-600" : "text-red-600"
          )}>
            {isHigher ? '+' : ''}{difference} points {isHigher ? 'above' : 'below'} average
          </div>
        )}
        <div className="text-sm text-muted-foreground mt-1">
          Based on {totalRatings} ratings
        </div>
      </div>
    </div>
  )
}

// Rating History Component
export function RatingHistory({ 
  ratings, 
  maxDisplay = 5 
}: RatingHistoryProps) {
  const [showAll, setShowAll] = useState(false)
  const displayedRatings = showAll ? ratings : ratings.slice(0, maxDisplay)

  if (ratings.length === 0) {
    return (
      <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
        No rating history available
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Rating History</h3>
        <span className="text-sm text-muted-foreground">
          {ratings.length} total ratings
        </span>
      </div>
      
      <motion.div className="space-y-2" variants={staggerContainer} {...getMotionProps()}>
        {displayedRatings.map((ratingHistory) => {
          const scoreLevel = getScoreLevel(ratingHistory.rating.overallScore)
          
          return (
            <motion.div 
              key={`rating-history-${ratingHistory.performanceId}`}
              className="flex items-center justify-between p-3 bg-secondary rounded-lg border border-border hover:border-primary/20 transition-colors"
              variants={fadeInUp}
            >
              <div className="flex-1">
                <div className="font-medium text-foreground">
                  {ratingHistory.performance.actor.name}
                </div>
                <div className="text-sm text-muted-foreground">
                  in &quot;{ratingHistory.performance.movie.title}&quot; as {ratingHistory.performance.comment || 'Unknown Character'} ({ratingHistory.performance.movie.year})
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(ratingHistory.rating.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right">
                <div 
                  className="text-xl font-bold"
                  style={{ color: scoreLevel.color }}
                >
                  {ratingHistory.rating.overallScore}
                </div>
                <div className="text-xs text-muted-foreground">
                  {scoreLevel.level}
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>

      {ratings.length > maxDisplay && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full p-2 text-sm text-primary hover:bg-primary/10 rounded-lg transition-colors"
        >
          {showAll ? 'Show Less' : `Show ${ratings.length - maxDisplay} More`}
        </button>
      )}
    </div>
  )
}

// Average Rating Component
export function AverageRating({ 
  performanceId, 
  ratings 
}: AverageRatingProps) {
  const stats = calculateRatingStats(ratings)
  
  if (!stats) {
    return (
      <div className="p-4 bg-muted rounded-lg text-center text-muted-foreground">
        No ratings available
      </div>
    )
  }

  const averageScoreLevel = getScoreLevel(stats.average)

  return (
    <div className="p-4 bg-secondary rounded-lg border border-border">
      <h3 className="text-lg font-semibold text-foreground mb-3">Community Rating</h3>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">Average</div>
          <div 
            className="text-3xl font-bold"
            style={{ color: averageScoreLevel.color }}
          >
            {stats.average}
          </div>
          <div className="text-sm text-muted-foreground">
            {averageScoreLevel.level}
          </div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-muted-foreground">Total</div>
          <div className="text-3xl font-bold">{stats.total}</div>
          <div className="text-sm text-muted-foreground">ratings</div>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Range:</span>
          <span>{stats.min} - {stats.max}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span>Median:</span>
          <span>{stats.median}</span>
        </div>
      </div>

      {/* Score Distribution */}
      <div className="mt-4">
        <h4 className="text-sm font-medium text-foreground mb-2">Score Distribution</h4>
        <div className="space-y-1">
          {Object.entries(stats.distribution).map(([range, count]) => (
            <div key={range} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{range}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 bg-muted rounded-full h-2">
                  <div
                    className="h-2 bg-primary rounded-full"
                    style={{ width: `${(count / stats.total) * 100}%` }}
                  />
                </div>
                <span className="text-muted-foreground w-8 text-right">{count}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Main Rating Display Component
export function RatingDisplay({ 
  rating, 
  showBreakdown = true, 
  showComparison = false, 
  compact = false 
}: RatingDisplayProps) {
  return (
    <div className={cn(
      "space-y-6",
      compact && "space-y-4"
    )}>
      {/* Overall Score */}
      <div className="flex justify-center">
        <OverallScore 
          score={rating.overallScore} 
          size={compact ? 'small' : 'medium'}
          animated={true}
        />
      </div>

      {/* Criteria Breakdown */}
      {showBreakdown && (
        <CriteriaBreakdown 
          criteria={rating.criteria} 
          weights={DEFAULT_WEIGHTS}
        />
      )}

      {/* Comment */}
      {rating.comment && (
        <div className="p-4 bg-muted rounded-lg">
          <h3 className="text-sm font-medium text-foreground mb-2">Comment</h3>
          <p className="text-sm text-muted-foreground">{rating.comment}</p>
        </div>
      )}

      {/* Rating Date */}
      <div className="text-xs text-muted-foreground text-center">
        Rated on {new Date(rating.createdAt).toLocaleDateString()}
      </div>
    </div>
  )
} 