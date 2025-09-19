"use client"

import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { scaleIn, getMotionProps } from '@/lib/animations'

interface StarScoreVisualizerProps {
  score: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

export const StarScoreVisualizer: React.FC<StarScoreVisualizerProps> = ({
  score,
  size = 'md',
  showLabel = true,
  className
}) => {
  const [animatedScore, setAnimatedScore] = useState(0)
  const [isAnimating, setIsAnimating] = useState(true)

  // Clamp score between 0 and 100
  const clampedScore = Math.max(0, Math.min(100, score))

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-16 h-16',
      star: 'w-14 h-14',
      label: 'text-sm'
    },
    md: {
      container: 'w-20 h-20',
      star: 'w-18 h-18',
      label: 'text-base'
    },
    lg: {
      container: 'w-24 h-24',
      star: 'w-22 h-22',
      label: 'text-lg'
    }
  }

  const config = sizeConfig[size]

  // Star path coordinates (5-pointed star)
  const starPath = "M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"

  // Animate score on mount
  useEffect(() => {
    setIsAnimating(true)
    const duration = 500 // 500ms animation as requested
    const steps = 30 // 30fps for smooth animation
    const increment = clampedScore / steps
    const stepDuration = duration / steps

    let currentStep = 0
    const timer = setInterval(() => {
      currentStep++
      const newScore = Math.min(increment * currentStep, clampedScore)
      setAnimatedScore(newScore)

      if (currentStep >= steps) {
        setAnimatedScore(clampedScore)
        setIsAnimating(false)
        clearInterval(timer)
      }
    }, stepDuration)

    return () => clearInterval(timer)
  }, [clampedScore])

  // Calculate fill percentage for the mask with balanced visual impact
  const fillPercentage = (() => {
    // Use a balanced scale where only 100 results in full fill
    // This makes higher scores look more filled but still leaves room for 100
    if (animatedScore >= 80) {
      // 80-99 range: map to 65-90% fill, 100 gets 100%
      if (animatedScore === 100) {
        return 100
      }
      return 65 + ((animatedScore - 80) / 19) * 25
    } else if (animatedScore >= 60) {
      // 60-79 range: map to 45-65% fill
      return 45 + ((animatedScore - 60) / 19) * 20
    } else {
      // 0-59 range: linear mapping
      return (animatedScore / 60) * 45
    }
  })()

  return (
    <motion.div variants={scaleIn} {...getMotionProps()} className={cn('flex flex-col items-center justify-center', className)}>
      <div className={cn('relative', config.container)}>
        {/* Star outline - always visible with very thin stroke */}
        <svg
          className={cn('absolute inset-0', config.star)}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d={starPath}
            stroke="currentColor"
            strokeWidth="0.5"
            fill="none"
            className="text-yellow-500 drop-shadow-sm"
          />
        </svg>

        {/* Filled star with mask */}
        <svg
          className={cn('absolute inset-0', config.star)}
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <mask id={`star-fill-mask-${size}`}>
              {/* Background (white = visible) */}
              <rect width="24" height="24" fill="white" />
              
              {/* Star shape (black = hidden) */}
              <path
                d={starPath}
                fill="black"
              />
              
              {/* Fill area based on score - from bottom up */}
              <rect
                x="0"
                y={24 - (fillPercentage / 100) * 24}
                width="24"
                height={(fillPercentage / 100) * 24}
                fill="white"
              />
            </mask>
          </defs>
          
          {/* Filled star */}
          <path
            d={starPath}
            fill="currentColor"
            mask={`url(#star-fill-mask-${size})`}
            className="text-yellow-500 transition-all duration-200 ease-out"
          />
        </svg>
      </div>

      {/* Score label */}
      {showLabel && (
        <div 
          className={cn('mt-2 text-center font-semibold text-white', config.label)}
          aria-label={`Score: ${Math.round(animatedScore)} out of 100`}
        >
          {Math.round(animatedScore)} / 100
        </div>
      )}
    </motion.div>
  )
}

StarScoreVisualizer.displayName = 'StarScoreVisualizer'
