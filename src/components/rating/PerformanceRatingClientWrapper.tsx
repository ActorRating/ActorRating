"use client"

import React, { useState, useCallback, memo, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { SmoothSlider } from '@/components/ui/SmoothSlider'
import { Heart, Zap, Award, Eye, Users, Star, TrendingUp, CheckCircle2, Sparkles, Trophy } from 'lucide-react'

interface Performance {
  id: string
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
  emotionalRangeDepth: number
  characterBelievability: number
  technicalSkill: number
  screenPresence: number
  chemistryInteraction: number
  comment?: string
  user: {
    name: string
    email: string
  }
  createdAt: string
  updatedAt: string
}

interface PerformanceRatingClientWrapperProps {
  performance: Performance
  onSubmit: (ratingData: {
    emotionalRangeDepth: number
    characterBelievability: number
    technicalSkill: number
    screenPresence: number
    chemistryInteraction: number
  }) => Promise<void>
  submitting?: boolean
  initialRating?: {
    emotionalRangeDepth?: number
    characterBelievability?: number
    technicalSkill?: number
    screenPresence?: number
    chemistryInteraction?: number
  }
}

// Individual Slider Component
const RatingSliderCard = memo(function RatingSliderCard({
  icon: Icon,
  label,
  description,
  value,
  onValueChange,
  disabled = false
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  description: string
  value: number
  onValueChange: (value: number) => void
  disabled?: boolean
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  const qualityZone = useMemo(() => {
    if (value >= 90) return { zone: 'exceptional', color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Exceptional', icon: Trophy }
    if (value >= 80) return { zone: 'excellent', color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Excellent', icon: Star }
    if (value >= 70) return { zone: 'good', color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Good', icon: CheckCircle2 }
    if (value >= 60) return { zone: 'decent', color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Decent', icon: TrendingUp }
    if (value >= 40) return { zone: 'average', color: 'text-orange-400', bg: 'bg-orange-400/10', label: 'Average', icon: TrendingUp }
    return { zone: 'poor', color: 'text-red-400', bg: 'bg-red-400/10', label: 'Poor', icon: TrendingUp }
  }, [value])

  const QualityIcon = qualityZone.icon

  return (
    <motion.div
      layout
      className="p-4 sm:p-6 border border-border/30 hover:border-primary/50 transition-all duration-300 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50 relative overflow-hidden touch-manipulation flex flex-col"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className={`absolute inset-0 ${qualityZone.bg} opacity-20 blur-xl`} />

      <div className="relative flex-1 flex flex-col">
        <div className="flex items-center gap-3 sm:gap-4 mb-4">
          <div className="flex-1">
            <div className="mb-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-semibold text-white leading-tight">{label}</h3>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowTooltip(!showTooltip)}
                  aria-label="Show criteria details"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <QualityIcon className={`w-4 h-4 ${qualityZone.color}`} />
            </div>
          </div>

          <div className="text-right flex-shrink-0 min-w-[80px]">
            <div className={`text-2xl sm:text-3xl font-bold ${qualityZone.color}`}>
              {value}
            </div>
            <div className={`text-xs font-medium ${qualityZone.color} h-4 flex items-center justify-end`}>
              {qualityZone.label}
            </div>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4 mt-auto">
          <div className="px-1">
            <SmoothSlider
              value={value}
              onValueChange={onValueChange}
              min={0}
              max={100}
              step={1}
              disabled={disabled}
              showValue={false}
              showMinMax={true}
              size="lg"
              color="primary"
              className="w-full touch-manipulation"
            />
          </div>

          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span className={value >= 25 ? qualityZone.color : ''}>Poor</span>
            <span className={value >= 50 ? qualityZone.color : ''}>Average</span>
            <span className={value >= 75 ? qualityZone.color : ''}>Good</span>
            <span className={value >= 90 ? qualityZone.color : ''}>Exceptional</span>
          </div>
        </div>

        <AnimatePresence>
          {showTooltip && description && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute top-16 left-4 right-4 z-10 p-3 bg-background border border-border rounded-lg shadow-lg"
            >
              <p className="text-sm text-muted-foreground">{description}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
})

export const PerformanceRatingClientWrapper = memo(function PerformanceRatingClientWrapper({
  performance,
  onSubmit,
  submitting = false,
  initialRating
}: PerformanceRatingClientWrapperProps) {

  const [emotionalRangeDepth, setEmotionalRangeDepth] = useState(initialRating?.emotionalRangeDepth ?? 0)
  const [characterBelievability, setCharacterBelievability] = useState(initialRating?.characterBelievability ?? 0)
  const [technicalSkill, setTechnicalSkill] = useState(initialRating?.technicalSkill ?? 0)
  const [screenPresence, setScreenPresence] = useState(initialRating?.screenPresence ?? 0)
  const [chemistryInteraction, setChemistryInteraction] = useState(initialRating?.chemistryInteraction ?? 0)
  const [hasStartedRating, setHasStartedRating] = useState(false)

  const totalScoreOutOf100 = useMemo(() => {
    return (
      emotionalRangeDepth * 0.25 +
      characterBelievability * 0.25 +
      technicalSkill * 0.20 +
      screenPresence * 0.15 +
      chemistryInteraction * 0.15
    )
  }, [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction])

  const totalScore = useMemo(() => {
    return totalScoreOutOf100 / 10
  }, [totalScoreOutOf100])

  const progress = useMemo(() => {
    const scores = [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction]
    const changed = scores.filter(score => score !== 0).length
    return (changed / 5) * 100
  }, [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction])

  const getOverallQuality = useCallback((score: number) => {
    if (score >= 9) return {
      label: 'Masterpiece',
      color: 'text-amber-400',
      bg: 'from-amber-400/20 to-yellow-400/20',
      icon: Trophy,
      description: 'Oscar-worthy performance!'
    }
    if (score >= 8) return {
      label: 'Excellent',
      color: 'text-emerald-400',
      bg: 'from-emerald-400/20 to-green-400/20',
      icon: Star,
      description: 'Outstanding work!'
    }
    if (score >= 7) return {
      label: 'Good',
      color: 'text-blue-400',
      bg: 'from-blue-400/20 to-cyan-400/20',
      icon: CheckCircle2,
      description: 'Solid performance'
    }
    if (score >= 6) return {
      label: 'Decent',
      color: 'text-yellow-400',
      bg: 'from-yellow-400/20 to-orange-400/20',
      icon: TrendingUp,
      description: 'Above average'
    }
    if (score >= 4) return {
      label: 'Average',
      color: 'text-orange-400',
      bg: 'from-orange-400/20 to-red-400/20',
      icon: TrendingUp,
      description: 'Room for improvement'
    }
    return {
      label: 'Needs Work',
      color: 'text-red-400',
      bg: 'from-red-400/20 to-pink-400/20',
      icon: TrendingUp,
      description: 'Significant issues'
    }
  }, [])

  const overallQuality = useMemo(() => getOverallQuality(totalScore), [totalScore, getOverallQuality])
  const OverallIcon = overallQuality.icon

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    const ratingData = {
      emotionalRangeDepth: Math.round(emotionalRangeDepth),
      characterBelievability: Math.round(characterBelievability),
      technicalSkill: Math.round(technicalSkill),
      screenPresence: Math.round(screenPresence),
      chemistryInteraction: Math.round(chemistryInteraction)
    }

    try {
      await onSubmit(ratingData)
    } catch (err) {
      console.error(err)
    }
  }, [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction, onSubmit])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-8 lg:mb-10"
        >
          <h1 id="actor-name-header" className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-3 leading-tight">
            {performance.actor.name}
          </h1>
          <h2 className="text-base sm:text-lg lg:text-xl text-gray-400 font-medium">
            in &quot;{performance.movie.title}&quot; ({performance.movie.year})
          </h2>
        </motion.div>

        <form onSubmit={handleSubmit}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6 sm:space-y-8"
          >

            {/* SLIDERS */}
            <motion.div
              className="bg-gradient-to-br from-muted/70 to-muted/50 rounded-2xl border border-border/50 backdrop-blur-sm p-6 sm:p-8 lg:p-10 relative overflow-hidden"
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              <div className="relative">
                <motion.div
                  className="space-y-6 sm:space-y-8"
                  variants={{ hidden: {}, show: { transition: { staggerChildren: 0.1 } } }}
                  initial="hidden"
                  animate="show"
                >
                  <RatingSliderCard icon={Heart} label="Emotional Range & Depth" description="How convincingly the actor portrays emotions" value={emotionalRangeDepth} onValueChange={setEmotionalRangeDepth} disabled={submitting}/>
                  <RatingSliderCard icon={Award} label="Character Believability" description="How completely they become the character" value={characterBelievability} onValueChange={setCharacterBelievability} disabled={submitting}/>
                  <RatingSliderCard icon={Zap} label="Performance Quality" description="Timing, physicality, craft" value={technicalSkill} onValueChange={setTechnicalSkill} disabled={submitting}/>
                  <RatingSliderCard icon={Eye} label="Screen Presence" description="Ability to command attention" value={screenPresence} onValueChange={setScreenPresence} disabled={submitting}/>
                  <RatingSliderCard icon={Users} label="Chemistry & Interaction" description="How well they connect with others" value={chemistryInteraction} onValueChange={setChemistryInteraction} disabled={submitting}/>
                </motion.div>
              </div>
            </motion.div>

            {/* OVERALL SCORE */}
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 30 }}
              className="pt-6 sm:pt-8"
            >
              <motion.div
                className={`relative max-w-md mx-auto bg-gradient-to-br ${overallQuality.bg} rounded-3xl p-8 border-2 border-transparent bg-clip-padding backdrop-blur-sm overflow-hidden`}
                whileHover={{ scale: 1.02, y: -4 }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
              >
                <div className="relative text-center">
                  <div className="flex items-center justify-center gap-2 mb-3">
                    <OverallIcon className={`w-6 h-6 ${overallQuality.color}`} />
                    <h3 className={`text-xl sm:text-2xl font-bold ${overallQuality.color}`}>{overallQuality.label}</h3>
                    <OverallIcon className={`w-6 h-6 ${overallQuality.color}`} />
                  </div>

                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className={`text-5xl sm:text-6xl lg:text-7xl font-black ${overallQuality.color}`}>
                      {totalScore.toFixed(1)}
                    </div>
                    <Star className={`w-8 h-8 sm:w-10 sm:h-10 ${overallQuality.color} fill-current`} />
                  </div>

                  <p className={`text-sm sm:text-base font-medium ${overallQuality.color} mb-1`}>
                    {overallQuality.description}
                  </p>
                  <p className="text-xs text-muted-foreground">Out of 10</p>
                </div>
              </motion.div>
            </motion.div>

            {/* SUBMIT */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
              className="pt-8 flex justify-center"
            >
              <Button
                type="submit"
                disabled={submitting || progress < 100}
                variant="premium"
                size="lg"
                className="px-8 sm:px-12 py-4 text-base sm:text-lg font-bold rounded-2xl"
              >
                {submitting ? "Submitting..." : progress < 100 ? `Complete Ratings (${Math.round(progress)}%)` : "Submit Rating!"}
              </Button>
            </motion.div>

          </motion.div>
        </form>

      </div>
    </div>
  )
})
