"use client"

import React, { useState, useCallback, memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/Button'
import { SmoothSlider } from '@/components/ui/SmoothSlider'
import { Heart, Zap, Award, Eye, Users, Star, CheckCircle2, Trophy, TrendingUp, Sparkles } from 'lucide-react'

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
  createdAt: string
  updatedAt: string
}

interface PerformanceRatingClientWrapperProps {
  performance: Performance
  submitting?: boolean
}

// Individual slider card
const RatingSliderCard = memo(function RatingSliderCard({
  icon: Icon,
  label,
  value,
  onValueChange,
  disabled = false
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
  onValueChange: (value: number) => void
  disabled?: boolean
}) {
  const [lastValue, setLastValue] = useState(value)
  const [isChanging, setIsChanging] = useState(false)

  const handleValueChange = useCallback((newValue: number) => {
    setLastValue(value)
    setIsChanging(true)
    onValueChange(newValue)
    setTimeout(() => setIsChanging(false), 300)
  }, [onValueChange, value])

  const getQualityZone = useCallback((score: number) => {
    if (score >= 90) return { color: 'text-amber-400', icon: Trophy }
    if (score >= 80) return { color: 'text-emerald-400', icon: Star }
    if (score >= 70) return { color: 'text-blue-400', icon: CheckCircle2 }
    if (score >= 60) return { color: 'text-yellow-400', icon: TrendingUp }
    if (score >= 40) return { color: 'text-orange-400', icon: TrendingUp }
    return { color: 'text-red-400', icon: TrendingUp }
  }, [])

  const qualityZone = getQualityZone(value)

  return (
    <motion.div
      layout
      className="p-4 sm:p-6 border border-border/30 rounded-xl bg-muted/30 relative overflow-hidden flex flex-col"
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-white">{label}</h3>
        <Icon className={`${qualityZone.color} w-5 h-5`} />
      </div>
      <SmoothSlider
        value={value}
        onValueChange={handleValueChange}
        min={0}
        max={100}
        step={1}
        disabled={disabled}
        showValue={true}
        showMinMax={true}
        size="lg"
        color="primary"
      />
    </motion.div>
  )
})

export const PerformanceRatingClientWrapper = memo(function PerformanceRatingClientWrapper({
  performance,
  submitting = false
}: PerformanceRatingClientWrapperProps) {
  const [emotionalRangeDepth, setEmotionalRangeDepth] = useState(0)
  const [characterBelievability, setCharacterBelievability] = useState(0)
  const [technicalSkill, setTechnicalSkill] = useState(0)
  const [screenPresence, setScreenPresence] = useState(0)
  const [chemistryInteraction, setChemistryInteraction] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const totalScore = useMemo(() => (
    emotionalRangeDepth * 0.25 +
    characterBelievability * 0.25 +
    technicalSkill * 0.20 +
    screenPresence * 0.15 +
    chemistryInteraction * 0.15
  ), [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction])

  const progress = useMemo(() => {
    const scores = [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction]
    return (scores.filter(score => score !== 0).length / 5) * 100
  }, [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actorId: performance.actor.id,
          movieId: performance.movie.id,
          emotionalRangeDepth,
          characterBelievability,
          technicalSkill,
          screenPresence,
          chemistryInteraction
        })
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit rating')
      }
      // success
      await res.json()
      alert('Rating submitted!')
    } catch (err: any) {
      setError(err.message || 'Unknown error')
    } finally {
      setIsSubmitting(false)
    }
  }, [performance, emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction])

  return (
    <div className="min-h-screen bg-background p-6 sm:p-8">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-3xl font-bold text-white text-center mb-2">{performance.actor.name}</h1>
        <h2 className="text-lg text-gray-400 text-center mb-6">{performance.movie.title} ({performance.movie.year})</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          <RatingSliderCard icon={Heart} label="Emotional Range & Depth" value={emotionalRangeDepth} onValueChange={setEmotionalRangeDepth} disabled={isSubmitting} />
          <RatingSliderCard icon={Award} label="Character Believability" value={characterBelievability} onValueChange={setCharacterBelievability} disabled={isSubmitting} />
          <RatingSliderCard icon={Zap} label="Performance Quality" value={technicalSkill} onValueChange={setTechnicalSkill} disabled={isSubmitting} />
          <RatingSliderCard icon={Eye} label="Screen Presence" value={screenPresence} onValueChange={setScreenPresence} disabled={isSubmitting} />
          <RatingSliderCard icon={Users} label="Chemistry & Interaction" value={chemistryInteraction} onValueChange={setChemistryInteraction} disabled={isSubmitting} />

          {error && <p className="text-red-400 text-center">{error}</p>}

          <div className="flex justify-center mt-4">
            <Button type="submit" disabled={isSubmitting || progress < 100} variant="premium" size="lg">
              {isSubmitting ? 'Submitting...' : `Submit Rating (${Math.round(progress)}%)`}
            </Button>
          </div>

          <p className="text-center text-white mt-4 text-lg font-semibold">Total Score: {totalScore.toFixed(1)}</p>
        </form>
      </div>
    </div>
  )
})
