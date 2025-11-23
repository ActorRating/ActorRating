"use client"

import React, { useState, useCallback, memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'

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

// Individual Slider Component - Minimalist with no numbers
const RatingSliderCard = memo(function RatingSliderCard({
  label,
  value,
  onValueChange,
  disabled = false,
  touched = false
}: {
  label: string
  value: number
  onValueChange: (value: number) => void
  disabled?: boolean
  touched?: boolean
}) {
  return (
    <div className="space-y-3">
      {/* Label */}
      <div className="flex items-center justify-between">
        <h3 className="text-base sm:text-lg font-medium text-white">{label}</h3>
      </div>

      {/* Slider Container */}
      <div className="relative pt-1">
        {/* Track Background */}
        <div className="relative h-2 bg-[#1a1a1a] rounded-full">
          {/* Fill - animated based on value */}
          <motion.div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-purple-600 via-violet-500 to-purple-600 rounded-full"
            style={{ width: `${value}%` }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          />
          
          {/* Hidden input for interaction */}
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={value}
            onChange={(e) => onValueChange(Number(e.target.value))}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            aria-label={label}
          />
          
          {/* Visible Thumb */}
          <div
            className="absolute top-1/2 w-5 h-5 bg-white rounded-full shadow-lg pointer-events-none transition-transform duration-150"
            style={{
              left: `${value}%`,
              transform: `translate(-50%, -50%)`,
              boxShadow: '0 0 20px rgba(139, 92, 246, 0.6)',
            }}
          />
        </div>
      </div>
    </div>
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

  // Track which sliders have been touched
  const [touchedSliders, setTouchedSliders] = useState({
    emotionalRangeDepth: initialRating?.emotionalRangeDepth !== undefined,
    characterBelievability: initialRating?.characterBelievability !== undefined,
    technicalSkill: initialRating?.technicalSkill !== undefined,
    screenPresence: initialRating?.screenPresence !== undefined,
    chemistryInteraction: initialRating?.chemistryInteraction !== undefined,
  })

  const totalScoreOutOf100 = useMemo(() => {
    return Math.round(
      emotionalRangeDepth * 0.25 +
      characterBelievability * 0.25 +
      technicalSkill * 0.20 +
      screenPresence * 0.15 +
      chemistryInteraction * 0.15
    )
  }, [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction])

  const allSlidersTouched = useMemo(() => {
    return Object.values(touchedSliders).every(touched => touched)
  }, [touchedSliders])

  const handleSliderChange = useCallback((key: keyof typeof touchedSliders, value: number) => {
    setTouchedSliders(prev => ({ ...prev, [key]: true }))
    
    switch(key) {
      case 'emotionalRangeDepth':
        setEmotionalRangeDepth(value)
        break
      case 'characterBelievability':
        setCharacterBelievability(value)
        break
      case 'technicalSkill':
        setTechnicalSkill(value)
        break
      case 'screenPresence':
        setScreenPresence(value)
        break
      case 'chemistryInteraction':
        setChemistryInteraction(value)
        break
    }
  }, [])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!allSlidersTouched) return

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
  }, [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction, onSubmit, allSlidersTouched])

  return (
    <div className="min-h-screen bg-black">
      {/* Subtle spotlight gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-[850px] mx-auto px-4 sm:px-6 py-12 sm:py-16">

        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-32"
        >
          {/* Actor Image */}
          {performance.actor.imageUrl && (
            <div className="mb-6 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-purple-600/30 blur-2xl rounded-lg" />
                <Image
                  src={performance.actor.imageUrl}
                  alt={performance.actor.name}
                  width={120}
                  height={120}
                  className="relative rounded-lg object-cover shadow-2xl"
                />
              </div>
            </div>
          )}

          {/* Actor Name */}
          <h1 id="actor-name-header" className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3 tracking-tight">
            {performance.actor.name}
          </h1>
          
          {/* Movie Title */}
          <h2 className="text-lg sm:text-xl text-gray-300 mb-2 font-medium">
            {performance.movie.title}
          </h2>
          
          {/* Role/Comment */}
          {performance.comment && (
            <p className="text-base text-gray-500">{performance.comment}</p>
          )}
        </motion.div>

        <form onSubmit={handleSubmit}>
          <div className="relative">
            
            {/* Glass Score Pill - overlapping top of card */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="absolute -top-12 left-1/2 -translate-x-1/2 z-20"
            >
              <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl px-8 py-4 shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/10 to-violet-400/10 rounded-2xl" />
                <div className="relative text-center">
                  <div className="text-4xl font-black text-white mb-1">
                    {totalScoreOutOf100}
                    <span className="text-2xl text-gray-400">/100</span>
                  </div>
                  <p className="text-xs text-gray-400 font-medium tracking-wide uppercase">Your Score</p>
                </div>
              </div>
            </motion.div>

            {/* Rating Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-[#0d0d0d] rounded-2xl p-8 shadow-2xl space-y-8"
            >
              
              {/* Sliders */}
              <div className="space-y-6">
                <RatingSliderCard 
                  label="Emotional Impact" 
                  value={emotionalRangeDepth} 
                  onValueChange={(v) => handleSliderChange('emotionalRangeDepth', v)}
                  disabled={submitting}
                  touched={touchedSliders.emotionalRangeDepth}
                />
                
                <RatingSliderCard 
                  label="Character Depth" 
                  value={characterBelievability} 
                  onValueChange={(v) => handleSliderChange('characterBelievability', v)}
                  disabled={submitting}
                  touched={touchedSliders.characterBelievability}
                />
                
                <RatingSliderCard 
                  label="Technical Skill" 
                  value={technicalSkill} 
                  onValueChange={(v) => handleSliderChange('technicalSkill', v)}
                  disabled={submitting}
                  touched={touchedSliders.technicalSkill}
                />
                
                <RatingSliderCard 
                  label="Screen Presence" 
                  value={screenPresence} 
                  onValueChange={(v) => handleSliderChange('screenPresence', v)}
                  disabled={submitting}
                  touched={touchedSliders.screenPresence}
                />
                
                <RatingSliderCard 
                  label="Originality" 
                  value={chemistryInteraction} 
                  onValueChange={(v) => handleSliderChange('chemistryInteraction', v)}
                  disabled={submitting}
                  touched={touchedSliders.chemistryInteraction}
                />
              </div>

              {/* Submit Button */}
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={!allSlidersTouched || submitting}
                  className={`
                    w-full py-4 text-lg font-bold rounded-2xl transition-all duration-300
                    ${allSlidersTouched && !submitting
                      ? 'bg-gradient-to-r from-purple-600 via-violet-600 to-purple-600 hover:from-purple-500 hover:via-violet-500 hover:to-purple-500 text-white shadow-lg shadow-purple-600/50 hover:shadow-xl hover:shadow-purple-600/60'
                      : 'bg-gray-800 text-gray-500 cursor-not-allowed opacity-50'
                    }
                  `}
                >
                  {submitting ? 'Submitting...' : allSlidersTouched ? 'Submit Rating' : 'Touch All Sliders to Continue'}
                </Button>
              </div>

            </motion.div>
          </div>
        </form>

      </div>
    </div>
  )
})
