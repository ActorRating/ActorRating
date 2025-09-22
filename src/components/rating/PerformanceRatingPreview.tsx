"use client"

import React, { useState, useCallback, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SmoothSlider } from '@/components/ui/SmoothSlider'
import { Heart, Award, Zap, Eye, Users, Star, TrendingUp, CheckCircle2, Trophy } from 'lucide-react'

// Local replica of the rating page's slider card for visual parity
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

  const handleValueChange = useCallback((newValue: number) => {
    setLastValue(value)
    setIsChanging(true)
    onValueChange(newValue)
    setTimeout(() => setIsChanging(false), 300)
  }, [onValueChange, value])

  return (
    <motion.div 
      layout
      className="p-4 sm:p-6 border border-border/30 hover:border-primary/50 transition-all duration-300 rounded-xl bg-gradient-to-br from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50 relative overflow-hidden touch-manipulation min-h-[180px] flex flex-col rating-card-mobile"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className={`absolute inset-0 ${qualityZone.bg} opacity-20 blur-xl`} />
      <div className="relative flex-1 flex flex-col">
        <div className="flex items-center gap-3 sm:gap-4 mb-4">
          <motion.div 
            className={`flex items-center justify-center w-12 h-12 rounded-xl text-primary relative ${qualityZone.bg}`}
            animate={{ 
              scale: isChanging ? [1, 1.05, 1] : 1
            }}
            transition={{ duration: 0.2 }}
          >
            <Icon className="w-6 h-6" />
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
          <div className="text-right flex-shrink-0 min-w-[80px]">
            <motion.div 
              className={`text-2xl sm:text-3xl font-bold ${qualityZone.color}`}
              animate={{ scale: isChanging ? [1, 1.1, 1] : 1 }}
              transition={{ duration: 0.2 }}
            >
              {value}
            </motion.div>
            <div className={`text-xs font-medium ${qualityZone.color} h-4 flex items-center justify-end`}>{qualityZone.label}</div>
          </div>
        </div>
        <div className="space-y-3 sm:space-y-4 mt-auto">
          <div className="px-1">
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
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span className={`${value >= 25 ? qualityZone.color : ''}`}>Poor</span>
            <span className={`${value >= 50 ? qualityZone.color : ''}`}>Average</span>
            <span className={`${value >= 75 ? qualityZone.color : ''}`}>Good</span>
            <span className={`${value >= 90 ? qualityZone.color : ''}`}>Exceptional</span>
          </div>
        </div>
      </div>
    </motion.div>
  )
})

export function PerformanceRatingPreview() {
  const [emotionalRangeDepth, setEmotionalRangeDepth] = useState(80)
  const [characterBelievability, setCharacterBelievability] = useState(85)
  const [technicalSkill, setTechnicalSkill] = useState(78)
  const [screenPresence, setScreenPresence] = useState(72)
  const [chemistryInteraction, setChemistryInteraction] = useState(70)

  const totalScore = useMemo(() => {
    return (
      emotionalRangeDepth * 0.25 +
      characterBelievability * 0.25 +
      technicalSkill * 0.20 +
      screenPresence * 0.15 +
      chemistryInteraction * 0.15
    )
  }, [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction])

  const getOverallQuality = useCallback((score: number) => {
    if (score >= 90) return { label: 'Masterpiece', color: 'text-amber-400', bg: 'from-amber-400/20 to-yellow-400/20', icon: Trophy, description: 'Oscar-worthy performance!' }
    if (score >= 80) return { label: 'Excellent', color: 'text-emerald-400', bg: 'from-emerald-400/20 to-green-400/20', icon: Star, description: 'Outstanding work!' }
    if (score >= 70) return { label: 'Good', color: 'text-blue-400', bg: 'from-blue-400/20 to-cyan-400/20', icon: CheckCircle2, description: 'Solid performance' }
    if (score >= 60) return { label: 'Decent', color: 'text-yellow-400', bg: 'from-yellow-400/20 to-orange-400/20', icon: TrendingUp, description: 'Above average' }
    if (score >= 40) return { label: 'Average', color: 'text-orange-400', bg: 'from-orange-400/20 to-red-400/20', icon: TrendingUp, description: 'Room for improvement' }
    return { label: 'Needs Work', color: 'text-red-400', bg: 'from-red-400/20 to-pink-400/20', icon: TrendingUp, description: 'Significant issues' }
  }, [])

  const overallQuality = getOverallQuality(totalScore)

  return (
    <div>
      {/* Rating Card (matches page style) */}
      <motion.div 
        className="bg-gradient-to-br from-muted/70 to-muted/50 rounded-2xl border border-border/50 backdrop-blur-sm p-6 sm:p-8 lg:p-10 relative overflow-hidden"
        whileHover={{ y: -2 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      >
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20" />
        </div>
        <div className="relative space-y-6 sm:space-y-8">
          <RatingSliderCard
            icon={Heart}
            label="Emotional Range & Depth"
            description="How convincingly the actor portrays different emotions"
            value={emotionalRangeDepth}
            onValueChange={setEmotionalRangeDepth}
          />
          <RatingSliderCard
            icon={Award}
            label="Character Believability"
            description="How completely the actor transforms into the character"
            value={characterBelievability}
            onValueChange={setCharacterBelievability}
          />
          <RatingSliderCard
            icon={Zap}
            label="Technical Skill"
            description="Voice work, physicality, timing, and overall craft"
            value={technicalSkill}
            onValueChange={setTechnicalSkill}
          />
          <RatingSliderCard
            icon={Eye}
            label="Screen Presence"
            description="Charisma and ability to command attention"
            value={screenPresence}
            onValueChange={setScreenPresence}
          />
          <RatingSliderCard
            icon={Users}
            label="Chemistry & Interaction"
            description="How well they connect with other actors"
            value={chemistryInteraction}
            onValueChange={setChemistryInteraction}
          />
        </div>
      </motion.div>

      {/* Total Score Display (matches page style) */}
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 30 }}
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
          <div className="absolute inset-0 opacity-30">
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20"
              animate={{ opacity: [0.3, 0.5, 0.3], scale: [1, 1.1, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <div className="relative text-center">
            <motion.div className="flex items-center justify-center gap-2 mb-3">
              <overallQuality.icon className={`w-6 h-6 ${overallQuality.color}`} />
              <h3 className={`text-xl sm:text-2xl font-bold ${overallQuality.color}`}>{overallQuality.label}</h3>
              <overallQuality.icon className={`w-6 h-6 ${overallQuality.color}`} />
            </motion.div>
            <motion.div className="flex items-center justify-center gap-3 mb-2">
              <div className={`text-5xl sm:text-6xl lg:text-7xl font-black ${overallQuality.color}`}>{totalScore.toFixed(1)}</div>
              <Star className={`w-8 h-8 sm:w-10 sm:h-10 ${overallQuality.color} fill-current`} />
            </motion.div>
            <p className={`text-sm sm:text-base font-medium ${overallQuality.color} mb-1`}>{overallQuality.description}</p>
            <p className="text-xs text-muted-foreground">Average out of 100</p>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}


