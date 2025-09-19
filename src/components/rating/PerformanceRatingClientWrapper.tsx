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

// Individual Slider Component with isolated state and addictive feedback
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
  const [lastValue, setLastValue] = useState(value)
  const [isChanging, setIsChanging] = useState(false)

  // Quality zone and feedback
  const getQualityZone = useCallback((score: number) => {
    if (score >= 90) return { zone: 'exceptional', color: 'text-amber-400', bg: 'bg-amber-400/10', label: 'Exceptional', icon: Trophy }
    if (score >= 80) return { zone: 'excellent', color: 'text-emerald-400', bg: 'bg-emerald-400/10', label: 'Excellent', icon: Star }
    if (score >= 70) return { zone: 'good', color: 'text-blue-400', bg: 'bg-blue-400/10', label: 'Good', icon: CheckCircle2 }
    if (score >= 60) return { zone: 'decent', color: 'text-yellow-400', bg: 'bg-yellow-400/10', label: 'Decent', icon: TrendingUp }
    if (score >= 40) return { zone: 'average', color: 'text-orange-400', bg: 'bg-orange-400/10', label: 'Average', icon: TrendingUp }
    return { zone: 'poor', color: 'text-red-400', bg: 'bg-red-400/10', label: 'Poor', icon: TrendingUp }
  }, [])

  const qualityZone = getQualityZone(value)
  const isImproving = value > lastValue
  const isDecreasing = value < lastValue

  // Memoized change handler with feedback
  const handleValueChange = useCallback((newValue: number) => {
    setLastValue(value)
    setIsChanging(true)
    onValueChange(newValue)
    
    // Reset changing state after animation
    setTimeout(() => setIsChanging(false), 300)
  }, [onValueChange, value])

  return (
    <motion.div 
      layout
      className="p-4 sm:p-6 border border-border/30 hover:border-primary/50 transition-all duration-300 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50 relative overflow-hidden touch-manipulation"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      {/* Background glow effect based on score */}
      <div className={`absolute inset-0 ${qualityZone.bg} opacity-20 blur-xl`} />
      
      <div className="relative">
        {/* Header with icon and feedback */}
        <div className="flex items-center gap-3 sm:gap-4 mb-4">
          <motion.div 
            className={`flex items-center justify-center w-12 h-12 rounded-xl text-primary relative ${qualityZone.bg}`}
            animate={{ 
              scale: isChanging ? [1, 1.05, 1] : 1
            }}
            transition={{ duration: 0.2 }}
          >
            <Icon className="w-6 h-6" />
            
            {/* Quality indicator */}
            <AnimatePresence>
              {isChanging && (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="absolute -top-1 -right-1"
                >
                  {isImproving ? (
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  ) : isDecreasing ? (
                    <TrendingUp className="w-4 h-4 text-red-400 rotate-180" />
                  ) : null}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-base sm:text-lg font-semibold text-white truncate">{label}</h3>
              <qualityZone.icon className={`w-4 h-4 flex-shrink-0 ${qualityZone.color}`} />
            </div>
            <p className="text-xs sm:text-sm text-gray-400 leading-relaxed">{description}</p>
          </div>
          
          {/* Score display with quality zone */}
          <div className="text-right flex-shrink-0">
            <motion.div 
              className={`text-2xl sm:text-3xl font-bold ${qualityZone.color}`}
              animate={{ 
                scale: isChanging ? [1, 1.1, 1] : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              {value}
            </motion.div>
            <div className={`text-xs font-medium ${qualityZone.color}`}>
              {qualityZone.label}
            </div>
          </div>
        </div>
        
        {/* Enhanced slider with haptic-like feedback */}
        <div className="space-y-3 sm:space-y-4">
          <div className="px-1"> {/* Add padding to prevent touch target cutoff */}
            <SmoothSlider
              value={value}
              onValueChange={handleValueChange}
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
          
          {/* Quality milestones */}
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span className={`transition-colors duration-200 ${value >= 25 ? qualityZone.color : ''}`}>Poor</span>
            <span className={`transition-colors duration-200 ${value >= 50 ? qualityZone.color : ''}`}>Average</span>
            <span className={`transition-colors duration-200 ${value >= 75 ? qualityZone.color : ''}`}>Good</span>
            <span className={`transition-colors duration-200 ${value >= 90 ? qualityZone.color : ''}`}>Exceptional</span>
          </div>
        </div>
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
  // Individual state for each slider to prevent re-renders
  const [emotionalRangeDepth, setEmotionalRangeDepth] = useState(initialRating?.emotionalRangeDepth ?? 0)
  const [characterBelievability, setCharacterBelievability] = useState(initialRating?.characterBelievability ?? 0)
  const [technicalSkill, setTechnicalSkill] = useState(initialRating?.technicalSkill ?? 0)
  const [screenPresence, setScreenPresence] = useState(initialRating?.screenPresence ?? 0)
  const [chemistryInteraction, setChemistryInteraction] = useState(initialRating?.chemistryInteraction ?? 0)
  const [hasStartedRating, setHasStartedRating] = useState(false)

  // Calculate total score in real-time using weighted calculation (same as backend)
  const totalScore = useMemo(() => {
    return (
      emotionalRangeDepth * 0.25 +
      characterBelievability * 0.25 +
      technicalSkill * 0.20 +
      screenPresence * 0.15 +
      chemistryInteraction * 0.15
    )
  }, [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction])

  // Progress tracking
  const progress = useMemo(() => {
    const scores = [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction]
    const changedFromDefault = scores.filter(score => score !== 0).length
    return (changedFromDefault / 5) * 100
  }, [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction])

  // Quality assessment
  const getOverallQuality = useCallback((score: number) => {
    if (score >= 90) return { 
      label: 'Masterpiece', 
      color: 'text-amber-400', 
      bg: 'from-amber-400/20 to-yellow-400/20',
      icon: Trophy,
      description: 'Oscar-worthy performance!'
    }
    if (score >= 80) return { 
      label: 'Excellent', 
      color: 'text-emerald-400', 
      bg: 'from-emerald-400/20 to-green-400/20',
      icon: Star,
      description: 'Outstanding work!'
    }
    if (score >= 70) return { 
      label: 'Good', 
      color: 'text-blue-400', 
      bg: 'from-blue-400/20 to-cyan-400/20',
      icon: CheckCircle2,
      description: 'Solid performance'
    }
    if (score >= 60) return { 
      label: 'Decent', 
      color: 'text-yellow-400', 
      bg: 'from-yellow-400/20 to-orange-400/20',
      icon: TrendingUp,
      description: 'Above average'
    }
    if (score >= 40) return { 
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

  const overallQuality = getOverallQuality(totalScore)

  // Memoized change handlers to prevent unnecessary re-renders
  const handleEmotionalRangeChange = useCallback((value: number) => {
    setEmotionalRangeDepth(value)
    if (!hasStartedRating) setHasStartedRating(true)
  }, [hasStartedRating])

  const handleCharacterBelievabilityChange = useCallback((value: number) => {
    setCharacterBelievability(value)
    if (!hasStartedRating) setHasStartedRating(true)
  }, [hasStartedRating])

  const handleTechnicalSkillChange = useCallback((value: number) => {
    setTechnicalSkill(value)
    if (!hasStartedRating) setHasStartedRating(true)
  }, [hasStartedRating])

  const handleScreenPresenceChange = useCallback((value: number) => {
    setScreenPresence(value)
    if (!hasStartedRating) setHasStartedRating(true)
  }, [hasStartedRating])

  const handleChemistryInteractionChange = useCallback((value: number) => {
    setChemistryInteraction(value)
    if (!hasStartedRating) setHasStartedRating(true)
  }, [hasStartedRating])

  const handleSubmit = useCallback(async (event: React.FormEvent) => {
    event.preventDefault()
    
    const ratingData = {
      emotionalRangeDepth,
      characterBelievability,
      technicalSkill,
      screenPresence,
      chemistryInteraction
    }

    await onSubmit(ratingData)
  }, [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction, onSubmit])

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-12">

        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6 sm:mb-8 lg:mb-10"
        >
          
          <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-bold text-white mb-3 leading-tight">
            {performance.actor.name}
          </h1>
          <h2 className="text-base sm:text-lg lg:text-xl text-gray-400 font-medium">
            in &quot;{performance.movie.title}&quot; ({performance.movie.year})
          </h2>
        </motion.div>

        {/* Rating Form */}
        <form onSubmit={handleSubmit}>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6 sm:space-y-8"
          >
            {/* Enhanced Rating Card */}
            <motion.div 
              className="bg-gradient-to-br from-muted/70 to-muted/50 rounded-2xl border border-border/50 backdrop-blur-sm p-6 sm:p-8 lg:p-10 relative overflow-hidden"
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Animated background pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
              </div>
              
              <div className="relative">

                <motion.div 
                  className="space-y-6 sm:space-y-8"
                  variants={{
                    hidden: {},
                    show: {
                      transition: {
                        staggerChildren: 0.1
                      }
                    }
                  }}
                  initial="hidden"
                  animate="show"
                >
                  <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}>
                    <RatingSliderCard
                      key="emotional-range"
                      icon={Heart}
                      label="Emotional Range & Depth"
                      description="How convincingly the actor portrays different emotions"
                      value={emotionalRangeDepth}
                      onValueChange={handleEmotionalRangeChange}
                      disabled={submitting}
                    />
                  </motion.div>

                  <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}>
                    <RatingSliderCard
                      key="character-believability"
                      icon={Award}
                      label="Character Believability"
                      description="How completely the actor transforms into the character"
                      value={characterBelievability}
                      onValueChange={handleCharacterBelievabilityChange}
                      disabled={submitting}
                    />
                  </motion.div>

                  <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}>
                    <RatingSliderCard
                      key="technical-skill"
                      icon={Zap}
                      label="Technical Skill"
                      description="Voice work, physicality, timing, and overall craft"
                      value={technicalSkill}
                      onValueChange={handleTechnicalSkillChange}
                      disabled={submitting}
                    />
                  </motion.div>

                  <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}>
                    <RatingSliderCard
                      key="screen-presence"
                      icon={Eye}
                      label="Screen Presence"
                      description="Charisma and ability to command attention"
                      value={screenPresence}
                      onValueChange={handleScreenPresenceChange}
                      disabled={submitting}
                    />
                  </motion.div>

                  <motion.div variants={{ hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } }}>
                    <RatingSliderCard
                      key="chemistry-interaction"
                      icon={Users}
                      label="Chemistry & Interaction"
                      description="How well they connect with other actors"
                      value={chemistryInteraction}
                      onValueChange={handleChemistryInteractionChange}
                      disabled={submitting}
                    />
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>

            {/* Enhanced Total Score Display */}
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
                style={{
                  background: `linear-gradient(135deg, ${
                    totalScore >= 90 ? 'rgba(251, 191, 36, 0.1)' :
                    totalScore >= 80 ? 'rgba(34, 197, 94, 0.1)' :
                    totalScore >= 70 ? 'rgba(59, 130, 246, 0.1)' :
                    totalScore >= 60 ? 'rgba(234, 179, 8, 0.1)' :
                    totalScore >= 40 ? 'rgba(249, 115, 22, 0.1)' :
                    'rgba(239, 68, 68, 0.1)'
                  }) 0%, rgba(0, 0, 0, 0.1) 100%)`
                }}
              >
                {/* Animated background effects */}
                <div className="absolute inset-0 opacity-30">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20"
                    animate={{
                      opacity: [0.3, 0.5, 0.3],
                      scale: [1, 1.1, 1],
                    }}
                    transition={{
                      duration: 3,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  />
                </div>

                <div className="relative text-center">
                  <motion.div
                    className="flex items-center justify-center gap-2 mb-3"
                    animate={{
                      rotate: totalScore >= 90 ? [0, 5, -5, 0] : 0
                    }}
                    transition={{
                      duration: 2,
                      repeat: totalScore >= 90 ? Infinity : 0
                    }}
                  >
                    <overallQuality.icon className={`w-6 h-6 ${overallQuality.color}`} />
                    <h3 className={`text-xl sm:text-2xl font-bold ${overallQuality.color}`}>
                      {overallQuality.label}
                    </h3>
                    <overallQuality.icon className={`w-6 h-6 ${overallQuality.color}`} />
                  </motion.div>

                  <motion.div 
                    className="flex items-center justify-center gap-3 mb-2"
                    animate={{
                      scale: hasStartedRating ? [1, 1.05, 1] : 1
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: hasStartedRating ? Infinity : 0,
                      repeatDelay: 2
                    }}
                  >
                    <div className={`text-5xl sm:text-6xl lg:text-7xl font-black ${overallQuality.color}`}>
                      {totalScore.toFixed(1)}
                    </div>
                    <motion.div
                      animate={{
                        rotate: [0, 360],
                        scale: [1, 1.2, 1]
                      }}
                      transition={{
                        rotate: { duration: 4, repeat: Infinity, ease: "linear" },
                        scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
                      }}
                    >
                      <Star className={`w-8 h-8 sm:w-10 sm:h-10 ${overallQuality.color} fill-current`} />
                    </motion.div>
                  </motion.div>

                  <p className={`text-sm sm:text-base font-medium ${overallQuality.color} mb-1`}>
                    {overallQuality.description}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Average out of 100
                  </p>

                  {/* Quality badges */}
                  <div className="flex justify-center mt-4 gap-1">
                    {[90, 80, 70, 60].map((threshold) => (
                      <motion.div
                        key={threshold}
                        className={`w-2 h-2 rounded-full ${
                          totalScore >= threshold ? overallQuality.color.replace('text-', 'bg-') : 'bg-gray-600'
                        }`}
                        animate={{
                          scale: totalScore >= threshold ? [1, 1.3, 1] : 1,
                          opacity: totalScore >= threshold ? [0.7, 1, 0.7] : 0.3
                        }}
                        transition={{
                          duration: 1.5,
                          repeat: totalScore >= threshold ? Infinity : 0,
                          delay: threshold / 100
                        }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>

            {/* Enhanced Submit Button */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, type: "spring", stiffness: 300, damping: 30 }}
              className="pt-8 flex justify-center"
            >
              <motion.div
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative"
              >
                {/* Glow effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-2xl blur-xl opacity-50"
                  animate={{
                    opacity: hasStartedRating ? [0.3, 0.6, 0.3] : 0.3,
                    scale: hasStartedRating ? [1, 1.1, 1] : 1
                  }}
                  transition={{
                    duration: 2,
                    repeat: hasStartedRating ? Infinity : 0,
                    ease: "easeInOut"
                  }}
                />
                
                <Button
                  type="submit"
                  disabled={submitting || progress < 100}
                  variant="premium"
                  size="lg"
                  className={`
                    relative px-8 sm:px-12 py-4 text-base sm:text-lg font-bold rounded-2xl 
                    transition-all duration-300 min-w-[200px] sm:min-w-[240px]
                    ${progress === 100 && !submitting ? 'animate-pulse' : ''}
                    ${submitting ? 'cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <motion.div 
                    className="flex items-center gap-3"
                    animate={{
                      x: submitting ? [0, 2, -2, 0] : 0
                    }}
                    transition={{
                      duration: 0.5,
                      repeat: submitting ? Infinity : 0
                    }}
                  >
                    {submitting ? (
                      <>
                        <motion.div
                          className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <span>Submitting Your Rating...</span>
                      </>
                    ) : progress < 100 ? (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Complete All Ratings ({Math.round(progress)}%)</span>
                      </>
                    ) : (
                      <>
                        <motion.div
                          animate={{
                            rotate: [0, 10, -10, 0],
                            scale: [1, 1.1, 1]
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          <CheckCircle2 className="w-5 h-5" />
                        </motion.div>
                        <span>Submit Your Rating!</span>
                        <motion.div
                          animate={{
                            rotate: [0, 10, -10, 0],
                            scale: [1, 1.1, 1]
                          }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: 0.5
                          }}
                        >
                          <Star className="w-5 h-5 fill-current" />
                        </motion.div>
                      </>
                    )}
                  </motion.div>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        </form>
      </div>
    </div>
  )
}) 