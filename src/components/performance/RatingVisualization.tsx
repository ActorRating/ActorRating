"use client"

import { motion, useReducedMotion } from 'framer-motion'
import { staggerContainer, fadeInUp, getMotionProps } from '@/lib/animations'
import { OscarCriteria } from '@/types/rating'

interface RatingVisualizationProps {
  criteria: OscarCriteria
  size?: 'small' | 'medium' | 'large'
  showLabels?: boolean
  className?: string
}

const CRITERIA_CONFIG = {
  technicalSkill: {
    label: 'Technical',
    color: '#3b82f6',
    description: 'Voice control, physical presence, technique'
  },
  emotionalDepth: {
    label: 'Emotional',
    color: '#8b5cf6',
    description: 'Range of emotions, authenticity'
  },
  characterTransformation: {
    label: 'Character',
    color: '#06b6d4',
    description: 'Physical/mental transformation'
  },
  storyImpact: {
    label: 'Impact',
    color: '#10b981',
    description: 'Narrative importance'
  },
  difficultyFactor: {
    label: 'Difficulty',
    color: '#f59e0b',
    description: 'Role complexity, challenges'
  }
}

export function RatingVisualization({ 
  criteria, 
  size = 'medium', 
  showLabels = true,
  className = ''
}: RatingVisualizationProps) {
  const prefersReducedMotion = useReducedMotion()
  const sizeConfig = {
    small: {
      barHeight: 4,
      gap: 'space-y-2',
      fontSize: 'text-xs',
      labelSize: 'text-xs'
    },
    medium: {
      barHeight: 6,
      gap: 'space-y-3',
      fontSize: 'text-sm',
      labelSize: 'text-xs'
    },
    large: {
      barHeight: 8,
      gap: 'space-y-4',
      fontSize: 'text-base',
      labelSize: 'text-sm'
    }
  }

  const config = sizeConfig[size]

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#22c55e' // Green for excellent
    if (score >= 60) return '#3b82f6' // Blue for very good
    if (score >= 40) return '#f59e0b' // Yellow for good
    if (score >= 20) return '#f97316' // Orange for fair
    return '#ef4444' // Red for poor
  }

  const getScoreLevel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Very Good'
    if (score >= 40) return 'Good'
    if (score >= 20) return 'Fair'
    return 'Poor'
  }

  return (
    <div className={`${config.gap} ${className}`}>
      {showLabels && (
        <div className="flex items-center justify-between mb-2">
          <h4 className={`font-medium text-foreground ${config.fontSize}`}>
            Performance Breakdown
          </h4>
          <div className="text-xs text-muted-foreground">
            Average: {Math.round(Object.values(criteria).reduce((a, b) => a + b, 0) / 5)}
          </div>
        </div>
      )}
      
      <motion.div className="space-y-2" variants={staggerContainer} {...getMotionProps()}>
        {Object.entries(criteria).map(([key, score]) => {
          const criterionConfig = CRITERIA_CONFIG[key as keyof typeof CRITERIA_CONFIG]
          const color = getScoreColor(score)
          const level = getScoreLevel(score)
          
          return (
            <motion.div key={key} className="space-y-1" variants={fadeInUp}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: criterionConfig.color }}
                  />
                  <span className={`text-muted-foreground ${config.labelSize}`}>
                    {criterionConfig.label}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${config.fontSize}`} style={{ color }}>
                    {score}
                  </span>
                  <span className={`text-xs text-muted-foreground`}>
                    {level}
                  </span>
                </div>
              </div>
              
              <div className="relative">
                <div 
                  className="bg-muted rounded-full overflow-hidden"
                  style={{ height: config.barHeight }}
                >
                  <motion.div
                    initial={{ width: prefersReducedMotion ? `${score}%` : 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full"
                    style={{ 
                      backgroundColor: color,
                      backgroundImage: `linear-gradient(90deg, ${color}, ${color}dd)`
                    }}
                  />
                </div>
              </div>
            </motion.div>
          )
        })}
      </motion.div>
      
      {/* Overall Performance Indicator */}
      <div className="mt-4 pt-3 border-t border-border">
        <div className="flex items-center justify-between">
          <span className={`font-medium text-foreground ${config.fontSize}`}>
            Overall Performance
          </span>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {Object.entries(criteria).map(([key]) => (
                <div
                  key={key}
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: CRITERIA_CONFIG[key as keyof typeof CRITERIA_CONFIG].color }}
                />
              ))}
            </div>
            <span className={`text-xs text-muted-foreground`}>
              {Object.values(criteria).length} criteria
            </span>
          </div>
        </div>
      </div>
    </div>
  )
} 