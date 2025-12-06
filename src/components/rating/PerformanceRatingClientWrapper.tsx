"use client"

import React, { useState, useCallback, memo, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { Button } from "@/components/ui/Button"

// Lotto-style number roll hook - shows rolling numbers like a slot machine
function useNumberRoll(startValue: number, endValue: number, duration: number = 1000) {
  const [currentValue, setCurrentValue] = useState(startValue)
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    // Only animate if value actually changed
    if (Math.abs(endValue - startValue) < 0.01) {
      setCurrentValue(endValue)
      return
    }

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    setIsAnimating(true)
    const startTime = performance.now()
    startTimeRef.current = startTime

    const animate = (currentTime: number) => {
      if (!startTimeRef.current) return

      const elapsed = currentTime - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic for smooth deceleration (like lotto machine)
      const easeOut = 1 - Math.pow(1 - progress, 3)

      // Calculate current value - show integers during roll, decimal at end
      let current: number
      if (progress < 0.95) {
        // During animation: show integer values rolling
        current = Math.floor(startValue + (endValue - startValue) * easeOut)
      } else {
        // Final 5%: show decimal value
        current = startValue + (endValue - startValue) * easeOut
      }
      
      setCurrentValue(current)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Final value with decimal
        setCurrentValue(endValue)
        setIsAnimating(false)
        animationRef.current = null
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      setIsAnimating(false)
    }
  }, [startValue, endValue, duration])

  return { value: currentValue, isAnimating }
}

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
    emotionalDepth: number
    technicalSkill: number
    believability: number
    screenPresence: number
    chemistry: number
  }) => Promise<void>
  submitting?: boolean
  initialRating?: {
    emotionalDepth?: number
    technicalSkill?: number
    believability?: number
    screenPresence?: number
    chemistry?: number
  }
}

// Individual Slider Component - Premium Gold Design
const RatingSliderCard = memo(function RatingSliderCard({
  label,
  value,
  onValueChange,
  disabled = false,
  touched = false,
  spotlightActive = false
}: {
  label: string
  value: number
  onValueChange: (value: number) => void
  disabled?: boolean
  touched?: boolean
  spotlightActive?: boolean
}) {
  return (
    <motion.div 
      className="space-y-3 sm:space-y-4 relative"
      animate={{
        opacity: spotlightActive ? 0.5 : 1,
        filter: spotlightActive ? 'blur(1px)' : 'blur(0px)'
      }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {/* Label */}
      <div className="flex items-center justify-between mb-3">
        <h3 
          className="text-lg sm:text-xl font-semibold text-white"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {label}
        </h3>
      </div>

      {/* Slider Container */}
      <div className="relative pt-2">
        {/* Track Background */}
        <div className="relative h-3 bg-[#0a0a0a] rounded-full border border-white/5">
          {/* Fill - Gold gradient */}
          <motion.div
            className="absolute top-0 left-0 h-full rounded-full"
            style={{ 
              width: `${value}%`,
              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
              boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)'
            }}
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
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
            aria-label={label}
          />
          
          {/* Visible Thumb - Fixed size, no growth animation */}
          <div
            className="absolute top-1/2 w-6 h-6 rounded-full shadow-lg pointer-events-none"
            style={{
              left: `${value}%`,
              transform: `translate(-50%, -50%)`,
              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
              boxShadow: '0 0 20px rgba(255, 215, 0, 0.5), 0 4px 10px rgba(0, 0, 0, 0.3)',
            }}
          />
        </div>
      </div>

      {/* Quality Labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>Weak</span>
        <span>Exceptional</span>
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
  const router = useRouter()

  const [emotionalRangeDepth, setEmotionalRangeDepth] = useState(initialRating?.emotionalDepth ?? 0)
  const [characterBelievability, setCharacterBelievability] = useState(initialRating?.believability ?? 0)
  const [technicalSkill, setTechnicalSkill] = useState(initialRating?.technicalSkill ?? 0)
  const [screenPresence, setScreenPresence] = useState(initialRating?.screenPresence ?? 0)
  const [chemistryInteraction, setChemistryInteraction] = useState(initialRating?.chemistry ?? 0)

  // Track which sliders have been touched
  const [touchedSliders, setTouchedSliders] = useState({
    emotionalRangeDepth: initialRating?.emotionalDepth !== undefined,
    characterBelievability: initialRating?.believability !== undefined,
    technicalSkill: initialRating?.technicalSkill !== undefined,
    screenPresence: initialRating?.screenPresence !== undefined,
    chemistryInteraction: initialRating?.chemistry !== undefined,
  })

  // Spotlight animation state
  const [spotlightPhase, setSpotlightPhase] = useState<'none' | 'score' | 'button'>('none')
  const lastInteractionTime = useRef<number>(Date.now())
  const spotlightTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scoreRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const previousScoreRef = useRef(0)

  // Calculate average of 5 sliders, convert to 0-10 scale
  const totalScoreOutOf10 = useMemo(() => {
    const sliders = [
      emotionalRangeDepth,
      characterBelievability,
      technicalSkill,
      screenPresence,
      chemistryInteraction
    ]
    const average = sliders.reduce((a, b) => a + b, 0) / 5
    const totalScore = average / 10
    return Number(totalScore.toFixed(1)) // Round to 1 decimal place
  }, [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction])

  // Lotto roll animation - rolls every time score changes
  const { value: animatedScore, isAnimating } = useNumberRoll(previousScoreRef.current, totalScoreOutOf10, 1000)
  
  // Update previous score when animation completes
  useEffect(() => {
    if (!isAnimating) {
      previousScoreRef.current = totalScoreOutOf10
    }
  }, [isAnimating, totalScoreOutOf10])

  const allSlidersTouched = useMemo(() => {
    return Object.values(touchedSliders).every(touched => touched)
  }, [touchedSliders])

  const handleSliderChange = useCallback((key: keyof typeof touchedSliders, value: number) => {
    setTouchedSliders(prev => ({ ...prev, [key]: true }))
    lastInteractionTime.current = Date.now()
    
    // Reset spotlight when slider moves
    if (spotlightPhase !== 'none') {
      setSpotlightPhase('none')
    }
    
    // Clear any existing timeout
    if (spotlightTimeoutRef.current) {
      clearTimeout(spotlightTimeoutRef.current)
    }
    
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
  }, [spotlightPhase])


  // Trigger spotlight animation 5 seconds after last slider interaction
  useEffect(() => {
    if (!allSlidersTouched) return

    // Clear any existing timeout
    if (spotlightTimeoutRef.current) {
      clearTimeout(spotlightTimeoutRef.current)
    }

    const checkForSpotlight = () => {
      const timeSinceLastInteraction = Date.now() - lastInteractionTime.current
      
      if (timeSinceLastInteraction >= 5000 && spotlightPhase === 'none') {
        // Start spotlight on score - auto scroll
        setSpotlightPhase('score')
        
        // Auto scroll to score
        setTimeout(() => {
          scoreRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'center'
          })
        }, 100)
        
        // After 2 seconds, sweep to button (without disappearing)
        setTimeout(() => {
          setSpotlightPhase('button')
          
          // Auto scroll to button
          setTimeout(() => {
            buttonRef.current?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'center'
            })
          }, 100)
        }, 2000)
      }
    }

    // Set up a timeout to check after 5 seconds
    spotlightTimeoutRef.current = setTimeout(checkForSpotlight, 5000)

    return () => {
      if (spotlightTimeoutRef.current) {
        clearTimeout(spotlightTimeoutRef.current)
      }
    }
  }, [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction, allSlidersTouched, spotlightPhase])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!allSlidersTouched) return

    const ratingData = {
      emotionalDepth: Math.round(emotionalRangeDepth),
      technicalSkill: Math.round(technicalSkill),
      believability: Math.round(characterBelievability),
      screenPresence: Math.round(screenPresence),
      chemistry: Math.round(chemistryInteraction)
    }

    try {
      await onSubmit(ratingData)
    } catch (err) {
      console.error(err)
    }
  }, [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction, onSubmit, allSlidersTouched])

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#FFC800]/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#FFB000]/15 rounded-full blur-[150px]" />
      </div>

      {/* Spotlight overlay - sweeps in and slightly darkens everything */}
      <AnimatePresence>
        {spotlightPhase !== 'none' && (
          <motion.div
            initial={{ opacity: 0, clipPath: 'circle(0% at 50% 50%)' }}
            animate={{ 
              opacity: 1,
              clipPath: spotlightPhase === 'score' 
                ? 'circle(30% at 50% 20%)'
                : 'circle(25% at 50% 90%)'
            }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 bg-black/40 pointer-events-none z-40"
            style={{ backdropFilter: 'blur(2px)' }}
          />
        )}
      </AnimatePresence>

      <div className="relative max-w-[900px] mx-auto px-2 sm:px-6 py-12 sm:py-14 md:py-16 lg:py-20 pb-20 sm:pb-24 md:pb-32">

        {/* Header Section - Mobile optimized */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12 md:mb-16"
        >
          {/* Actor Name */}
          <h1 
            id="actor-name-header" 
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-3 sm:mb-4 tracking-tight px-2"
            style={{ fontFamily: 'var(--font-cinzel), serif' }}
          >
            {performance.actor.name}
          </h1>
          
          {/* Movie Title */}
          <h2 
            className="text-lg sm:text-xl md:text-2xl font-semibold mb-2 sm:mb-3 px-2"
            style={{
              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            {performance.movie.title}
          </h2>
          
          {/* Role/Comment */}
          {performance.comment && (
            <p className="text-sm sm:text-base text-[#a1a1aa] px-2">{performance.comment}</p>
          )}
        </motion.div>

        <form onSubmit={handleSubmit}>
          <div className="relative">
            
            {/* Score Display - Responsive size */}
            <motion.div
              ref={scoreRef}
              initial={{ opacity: 0, y: -20 }}
              animate={{ 
                opacity: 1, 
                y: 0,
                scale: spotlightPhase === 'score' ? 1.05 : 1
              }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="relative mx-auto mb-10 sm:mb-12 z-50 w-[260px] sm:w-[280px] md:w-[300px]"
            >
              <div 
                className="relative backdrop-blur-xl rounded-3xl px-7 sm:px-8 md:px-10 py-4 sm:py-4 md:py-5 shadow-2xl transition-all duration-700 overflow-hidden"
                style={{
                  width: '100%',
                  minHeight: '100px',
                  background: spotlightPhase === 'score' 
                    ? 'linear-gradient(135deg, rgba(255, 229, 92, 0.15) 0%, rgba(255, 215, 0, 0.15) 100%)'
                    : 'rgba(26, 26, 26, 0.8)',
                  border: spotlightPhase === 'score'
                    ? '2px solid rgba(255, 215, 0, 0.4)'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: spotlightPhase === 'score'
                    ? '0 0 60px rgba(255, 215, 0, 0.6), 0 0 120px rgba(255, 215, 0, 0.4), 0 20px 60px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.3)'
                    : '0 10px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.3)',
                  transform: 'perspective(1000px) rotateX(2deg) translateZ(20px)',
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Golden spotlight glow effect */}
                {spotlightPhase === 'score' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1.5, opacity: 1 }}
                    className="absolute inset-0 rounded-3xl pointer-events-none"
                    style={{
                      background: 'radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%)',
                      filter: 'blur(30px)',
                    }}
                  />
                )}
                <div className="relative text-center z-10">
                  <div 
                    className="text-4xl sm:text-5xl md:text-6xl font-black mb-2 min-h-[3rem] sm:min-h-[3.5rem] flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      fontFamily: 'var(--font-cinzel), serif',
                      position: 'relative',
                    }}
                  >
                    {/* Lotto roll effect - numbers rolling from bottom to top */}
                    <div className="relative inline-block overflow-hidden" style={{ minWidth: '80px', height: '3rem', lineHeight: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isAnimating ? (
                        <motion.span
                          key={`rolling-${Math.floor(animatedScore)}`}
                          initial={{ y: 30, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -30, opacity: 0 }}
                          transition={{ duration: 0.08, ease: 'easeOut' }}
                          className="inline-block text-4xl sm:text-5xl md:text-6xl"
                          style={{
                            background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          {Math.floor(animatedScore)}
                        </motion.span>
                      ) : (
                        <span
                          className="inline-block text-4xl sm:text-5xl md:text-6xl"
                          style={{
                            background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          {animatedScore.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <span className="text-2xl sm:text-3xl md:text-4xl text-[#a1a1aa] ml-0.5">/10</span>
                  </div>
                  <p className="text-xs text-[#d4d4d8] font-semibold tracking-widest uppercase">Your Score</p>
                </div>
              </div>
            </motion.div>

            {/* Rating Card - Extra round corners, mobile optimized */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ 
                opacity: spotlightPhase === 'score' ? 0.7 : 1,
                filter: spotlightPhase === 'score' ? 'blur(1px)' : 'blur(0px)'
              }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="relative rounded-[2.5rem] sm:rounded-[3rem] p-5 sm:p-6 md:p-8 lg:p-12 py-8 sm:py-10 md:py-12 space-y-5 sm:space-y-6 md:space-y-8 lg:space-y-10 border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/95 to-black/95 backdrop-blur-2xl overflow-hidden w-full max-w-[calc(100%-16px)] sm:max-w-full mx-auto"
              style={{
                boxShadow: `
                  0 35px 90px -20px rgba(0, 0, 0, 0.95),
                  0 20px 50px -10px rgba(0, 0, 0, 0.8),
                  0 0 0 1px rgba(255, 255, 255, 0.06),
                  inset 0 1px 0 0 rgba(255, 255, 255, 0.12),
                  inset 0 -1px 0 0 rgba(0, 0, 0, 0.4)
                `,
              }}
            >
              {/* Decorative corner accents - properly positioned */}
              <div 
                className="absolute pointer-events-none"
                style={{
                  bottom: '-1px',
                  right: '-1px',
                  width: '120px',
                  height: '120px',
                  background: 'radial-gradient(ellipse at bottom right, rgba(255, 215, 0, 0.08) 0%, transparent 60%)',
                  clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
                }}
              />
              <div 
                className="absolute pointer-events-none"
                style={{
                  top: '-1px',
                  left: '-1px',
                  width: '120px',
                  height: '120px',
                  background: 'radial-gradient(ellipse at top left, rgba(255, 165, 0, 0.05) 0%, transparent 60%)',
                  clipPath: 'polygon(0 0, 100% 0, 0 100%)',
                }}
              />
              
              {/* Sliders - Mobile optimized spacing, slightly narrower on mobile */}
              <div className="space-y-6 sm:space-y-8 relative z-10 max-w-[calc(100%-24px)] sm:max-w-[600px] mx-auto">
                <RatingSliderCard 
                  label="Emotional Impact" 
                  value={emotionalRangeDepth} 
                  onValueChange={(v) => handleSliderChange('emotionalRangeDepth', v)}
                  disabled={submitting}
                  touched={touchedSliders.emotionalRangeDepth}
                  spotlightActive={spotlightPhase !== 'none'}
                />
                
                <RatingSliderCard 
                  label="Character Depth" 
                  value={characterBelievability} 
                  onValueChange={(v) => handleSliderChange('characterBelievability', v)}
                  disabled={submitting}
                  touched={touchedSliders.characterBelievability}
                  spotlightActive={spotlightPhase !== 'none'}
                />
                
                <RatingSliderCard 
                  label="Technical Skill" 
                  value={technicalSkill} 
                  onValueChange={(v) => handleSliderChange('technicalSkill', v)}
                  disabled={submitting}
                  touched={touchedSliders.technicalSkill}
                  spotlightActive={spotlightPhase !== 'none'}
                />
                
                <RatingSliderCard 
                  label="Screen Presence" 
                  value={screenPresence} 
                  onValueChange={(v) => handleSliderChange('screenPresence', v)}
                  disabled={submitting}
                  touched={touchedSliders.screenPresence}
                  spotlightActive={spotlightPhase !== 'none'}
                />
                
                <RatingSliderCard 
                  label="Originality" 
                  value={chemistryInteraction} 
                  onValueChange={(v) => handleSliderChange('chemistryInteraction', v)}
                  disabled={submitting}
                  touched={touchedSliders.chemistryInteraction}
                  spotlightActive={spotlightPhase !== 'none'}
                />
              </div>

              {/* Submit Button with spotlight - Mobile optimized, never blurred */}
              <motion.div 
                className="pt-4 sm:pt-6 relative z-50"
                style={{
                  filter: 'blur(0px)',
                  opacity: 1,
                }}
                animate={{
                  scale: spotlightPhase === 'button' ? 1.02 : 1,
                }}
                transition={{ duration: 0.6 }}
              >
                {/* Golden spotlight glow on button - sweeps without disappearing */}
                {spotlightPhase === 'button' && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1.2, opacity: 1 }}
                    className="absolute inset-0 rounded-full pointer-events-none -z-10"
                    style={{
                      background: 'radial-gradient(ellipse 120% 100% at 50% 50%, rgba(255, 215, 0, 0.4) 0%, rgba(255, 215, 0, 0.2) 40%, transparent 70%)',
                      filter: 'blur(40px)',
                    }}
                  />
                )}
                <button
                  ref={buttonRef}
                  type="submit"
                  disabled={!allSlidersTouched || submitting}
                  className="group w-full py-4 sm:py-5 md:py-6 text-base sm:text-lg md:text-xl font-extrabold rounded-full transition-all duration-500 tracking-wider uppercase relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: allSlidersTouched && !submitting
                      ? 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)'
                      : '#1a1a1a',
                    color: allSlidersTouched && !submitting ? '#000000' : '#525252',
                    boxShadow: allSlidersTouched && !submitting
                      ? spotlightPhase === 'button'
                        ? '0 0 60px rgba(255, 215, 0, 0.7), 0 0 100px rgba(255, 215, 0, 0.4), 0 20px 60px rgba(0, 0, 0, 0.5)'
                        : '0 0 20px rgba(255, 215, 0, 0.25), 0 10px 30px rgba(0, 0, 0, 0.3)'
                      : 'none',
                    border: allSlidersTouched && !submitting ? 'none' : '1px solid #333',
                  }}
                >
                  {/* White light sweep effect on hover */}
                  {allSlidersTouched && !submitting && (
                    <span 
                      className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                      }}
                    />
                  )}
                  <span className="relative z-10">
                    {submitting ? 'Submitting...' : allSlidersTouched ? 'Submit Rating' : 'Complete All Ratings'}
                  </span>
                </button>
              </motion.div>

            </motion.div>
          </div>
        </form>

      </div>
    </div>
  )
})
