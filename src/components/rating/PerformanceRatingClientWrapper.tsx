"use client"

import React, { useState, useCallback, memo, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { CelebrationConfetti } from '@/components/ui/Confetti'
import { CheckCircle, Share2, Twitter, Facebook } from 'lucide-react'

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
  onSuccess?: (ratingData: {
    emotionalDepth: number
    technicalSkill: number
    believability: number
    screenPresence: number
    chemistry: number
  }) => void
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
  const [isActive, setIsActive] = useState(false)

  return (
    <motion.div 
      className="space-y-3 sm:space-y-4 relative"
      animate={{
        opacity: 1,
        filter: 'blur(0px)'
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
            onMouseDown={() => setIsActive(true)}
            onMouseUp={() => setIsActive(false)}
            onTouchStart={() => setIsActive(true)}
            onTouchEnd={() => setIsActive(false)}
            disabled={disabled}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
            aria-label={label}
          />
          
          {/* Visible Thumb - Grows when active */}
          <motion.div
            className="absolute top-1/2 rounded-full shadow-lg pointer-events-none"
            style={{
              left: `${value}%`,
              transform: `translate(-50%, -50%)`,
              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
              boxShadow: '0 0 20px rgba(255, 215, 0, 0.5), 0 4px 10px rgba(0, 0, 0, 0.3)',
            }}
            animate={{
              width: isActive ? '28px' : '24px',
              height: isActive ? '28px' : '24px',
            }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
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
  initialRating,
  onSuccess
}: PerformanceRatingClientWrapperProps) {
  const router = useRouter()
  
  // Success animation states
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'loading' | 'checkmark' | 'success'>('idle')
  const [showConfetti, setShowConfetti] = useState(false)
  const [finalScore, setFinalScore] = useState<number | null>(null)

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
    
    // Clear any existing timeout to reset the 5 second timer
    if (spotlightTimeoutRef.current) {
      clearTimeout(spotlightTimeoutRef.current)
      spotlightTimeoutRef.current = null
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


  // Trigger spotlight animation 100ms after last slider interaction
  useEffect(() => {
    if (!allSlidersTouched) return
    if (spotlightPhase !== 'none') return // Don't restart if already animating

    // Clear any existing timeout
    if (spotlightTimeoutRef.current) {
      clearTimeout(spotlightTimeoutRef.current)
    }

    const triggerAnimation = () => {
      const timeSinceLastInteraction = Date.now() - lastInteractionTime.current
      
      // Trigger after 100ms of inactivity
      if (timeSinceLastInteraction >= 100 && spotlightPhase === 'none') {
        // Effect 1: Score pulse
        setSpotlightPhase('score')
        
        // Effect 2: Scroll to score (after 200ms)
        setTimeout(() => {
          scoreRef.current?.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'center'
          })
        }, 200)
        
        // Effect 3: Button glow (after 1.2s, total ~1.8s)
        setTimeout(() => {
          setSpotlightPhase('button')
          
          // Scroll to button
          setTimeout(() => {
            buttonRef.current?.scrollIntoView({ 
              behavior: 'smooth', 
              block: 'center',
              inline: 'center'
            })
          }, 200)
        }, 1200)
      }
    }

    // Set up a timeout to check after 100ms
    spotlightTimeoutRef.current = setTimeout(triggerAnimation, 100)

    return () => {
      if (spotlightTimeoutRef.current) {
        clearTimeout(spotlightTimeoutRef.current)
        spotlightTimeoutRef.current = null
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

    // Calculate final score
    const score = (ratingData.emotionalDepth + ratingData.believability + ratingData.technicalSkill + ratingData.screenPresence + ratingData.chemistry) / 5 / 10
    setFinalScore(Number(score.toFixed(1)))

    const startTime = Date.now()

    // 0ms: Haptic feedback + start loading
    if ('vibrate' in navigator) {
      navigator.vibrate(50)
    }
    setSubmitPhase('loading')

    try {
      // Wait for API call
      await onSubmit(ratingData)
      
      const elapsed = Date.now() - startTime
      
      // 800ms: Morph to checkmark (ensure minimum 800ms total)
      const checkmarkDelay = Math.max(0, 800 - elapsed)
      setTimeout(() => {
        setSubmitPhase('checkmark')
      }, checkmarkDelay)
      
      // 1300ms: Confetti + fade transitions (ensure minimum 1300ms total)
      const successDelay = Math.max(0, 1300 - elapsed)
      setTimeout(() => {
        setShowConfetti(true)
        setSubmitPhase('success')
        if (onSuccess) {
          onSuccess(ratingData)
        }
      }, successDelay)
      
    } catch (err) {
      console.error(err)
      setSubmitPhase('idle')
      setShowConfetti(false)
    }
  }, [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction, onSubmit, allSlidersTouched, onSuccess])

  // Share functionality
  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/rate?actor=${performance.actor.id}&movie=${performance.movie.id}` : ''
  const shareText = finalScore !== null 
    ? `I gave ${performance.actor.name}'s performance in "${performance.movie.title}" a ${finalScore}/10. What's your rating? ${shareUrl}`
    : `Rate ${performance.actor.name}'s performance in "${performance.movie.title}" ${shareUrl}`

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Rating: ${performance.actor.name} in ${performance.movie.title}`,
          text: shareText,
          url: shareUrl,
        })
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled')
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText)
      alert('Link copied to clipboard!')
    }
  }

  const handleSocialShare = async (platform: 'twitter' | 'facebook') => {
    // Generate shareable image
    try {
      // Use the OG image endpoint to generate a shareable image
      const imageUrl = `${window.location.origin}/api/og?ratingId=${performance.actor.id}-${performance.movie.id}&size=og&actorName=${encodeURIComponent(performance.actor.name)}&movieTitle=${encodeURIComponent(performance.movie.title)}&score=${finalScore}`
      
      const encodedText = encodeURIComponent(shareText)
      const encodedUrl = encodeURIComponent(shareUrl)
      
      if (platform === 'twitter') {
        // Twitter doesn't support custom images in share dialog, but we can include the image URL in the text
        window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank')
      } else if (platform === 'facebook') {
        // Facebook can use og:image meta tags, but for direct sharing we use the URL
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank')
      }
    } catch (err) {
      console.error('Failed to generate share image:', err)
      // Fallback to text-only share
      const encodedText = encodeURIComponent(shareText)
      const encodedUrl = encodeURIComponent(shareUrl)
      if (platform === 'twitter') {
        window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank')
      } else if (platform === 'facebook') {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank')
      }
    }
  }

  return (
    <div className="min-h-screen bg-black relative overflow-x-hidden">
      {/* Confetti */}
      <CelebrationConfetti active={showConfetti} duration={3000} />
      
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#FFC800]/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#FFB000]/15 rounded-full blur-[150px]" />
      </div>



      <div className="relative max-w-[900px] mx-auto px-2 sm:px-6 pt-20 sm:pt-10 md:pt-12 lg:pt-16 pb-16 sm:pb-20 md:pb-24">

        {/* Header Section - Mobile optimized */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8 sm:mb-12 md:mb-16"
        >
          {/* Actor Name */}
          <h1 
            id="actor-name-header" 
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-3 sm:mb-4 tracking-tight px-2"
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
            
            {/* Score Display - Responsive size, prevent cutoff */}
            <AnimatePresence>
              {submitPhase !== 'success' && (
                <motion.div
                  ref={scoreRef}
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ 
                    opacity: submitPhase === 'success' ? 0 : 1, 
                    y: submitPhase === 'success' ? -20 : 0,
                    scale: spotlightPhase === 'score' ? [1, 1.05, 1] : 1
                  }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ 
                    delay: 0.2, 
                    duration: 1.0,
                    times: spotlightPhase === 'score' ? [0, 0.5, 1] : undefined,
                    ease: spotlightPhase === 'score' ? ['easeOut', 'easeIn'] : 'easeOut'
                  }}
                  className="relative mx-auto mb-8 z-50 w-[260px] sm:w-[280px] md:w-[300px]"
                  style={{ marginTop: '0', marginBottom: '2rem' }}
                >
              <div 
                className="relative backdrop-blur-xl rounded-3xl px-7 sm:px-8 md:px-10 py-6 sm:py-7 md:py-8 shadow-2xl transition-all duration-700 overflow-hidden"
                style={{
                  width: '100%',
                  minHeight: '130px',
                  background: 'rgba(26, 26, 26, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.3)',
                  transform: 'perspective(1000px) rotateX(2deg) translateZ(20px)',
                  transformStyle: 'preserve-3d',
                }}
              >
                {/* Score pulse effect - quick pulse animation */}
                <AnimatePresence>
                  {spotlightPhase === 'score' && (
                    <motion.div
                      initial={{ 
                        scale: 0.9,
                        opacity: 0,
                      }}
                      animate={{ 
                        scale: [0.9, 1.15, 1.0],
                        opacity: [0, 0.5, 0],
                      }}
                      exit={{
                        opacity: 0,
                      }}
                      transition={{ 
                        duration: 1.0,
                        times: [0, 0.5, 1],
                        ease: ['easeOut', 'easeIn'],
                      }}
                      className="absolute inset-0 pointer-events-none rounded-3xl"
                      style={{
                        background: 'radial-gradient(circle, rgba(255, 215, 0, 0.4) 0%, rgba(255, 200, 0, 0.2) 40%, transparent 70%)',
                        filter: 'blur(40px)',
                        zIndex: 0,
                      }}
                    />
                  )}
                </AnimatePresence>
                <div className="relative text-center z-10">
                  <div 
                    className="font-black mb-2 flex items-baseline justify-center gap-1 sm:gap-1.5 min-h-[3.5rem] sm:min-h-[4.5rem] pt-2 pb-2"
                    style={{
                      fontFamily: 'var(--font-cinzel), serif',
                      position: 'relative',
                    }}
                  >
                    {/* Lotto roll effect - numbers rolling from bottom to top */}
                    <div className="relative inline-block overflow-visible min-w-[70px] sm:min-w-[90px] h-[3.5rem] sm:h-[4.5rem] leading-[3.5rem] sm:leading-[4.5rem]">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={isAnimating ? Math.floor(animatedScore) : animatedScore.toFixed(1)}
                          initial={{ y: 40, opacity: 0 }}
                          animate={{ y: 0, opacity: 1 }}
                          exit={{ y: -40, opacity: 0 }}
                          transition={{ duration: 0.1, ease: 'easeOut' }}
                          className="inline-block text-5xl sm:text-5xl md:text-6xl lg:text-7xl"
                          style={{
                            background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            lineHeight: '1',
                            verticalAlign: 'baseline',
                          }}
                        >
                          {isAnimating ? Math.floor(animatedScore) : animatedScore.toFixed(1)}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                    <span 
                      className="text-lg sm:text-xl md:text-2xl lg:text-3xl text-[#a1a1aa] leading-none"
                      style={{
                        verticalAlign: 'baseline',
                      }}
                    >
                      /10
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-[#d4d4d8] font-semibold tracking-widest uppercase mt-1">Your Score</p>
                </div>
              </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Rating Card - Extra round corners, mobile optimized */}
            <AnimatePresence>
              {submitPhase !== 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ 
                    opacity: submitPhase === 'success' ? 0 : 1,
                    y: submitPhase === 'success' ? -20 : 0,
                  }}
                  exit={{ opacity: 0, y: -20 }}
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
              {/* Decorative corner accent - top left only */}
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

              {/* Submit Button with white light sweep - Mobile optimized, never blurred or darkened */}
              <motion.div 
                className="pt-4 sm:pt-6 relative"
                style={{
                  filter: 'blur(0px)',
                  opacity: 1,
                  zIndex: 60,
                }}
                animate={{
                  scale: spotlightPhase === 'button' ? 1.02 : 1,
                }}
                transition={{ duration: 0.6 }}
              >
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
                      ? '0 0 20px rgba(255, 215, 0, 0.25), 0 10px 30px rgba(0, 0, 0, 0.3)'
                      : 'none',
                    border: allSlidersTouched && !submitting ? 'none' : '1px solid #333',
                  }}
                >
                  {/* Button glow animation when spotlight phase is 'button' */}
                  {spotlightPhase === 'button' && (
                    <motion.span
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: [0, 0.6, 0.3], scale: [0.95, 1.05, 1.0] }}
                      transition={{ duration: 0.6, times: [0, 0.5, 1], ease: 'easeInOut' }}
                      className="absolute inset-0 pointer-events-none rounded-full"
                      style={{
                        background: 'radial-gradient(circle, rgba(255, 255, 255, 0.4) 0%, transparent 70%)',
                        filter: 'blur(20px)',
                      }}
                    />
                  )}
                  {/* White light sweep effect on hover */}
                  {allSlidersTouched && !submitting && spotlightPhase !== 'button' && (
                    <span 
                      className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"
                      style={{
                        background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                      }}
                    />
                  )}
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {submitPhase === 'loading' && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="w-5 h-5 border-2 border-black border-t-transparent rounded-full"
                        style={{
                          animation: 'spin 0.8s linear infinite',
                        }}
                      />
                    )}
                    {submitPhase === 'checkmark' && (
                      <motion.div
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ type: "spring", stiffness: 400, damping: 15 }}
                      >
                        <CheckCircle className="w-5 h-5 text-black" />
                      </motion.div>
                    )}
                    {submitPhase === 'idle' && (
                      submitting ? 'Submitting...' : allSlidersTouched ? 'Submit Rating' : 'Complete All Ratings'
                    )}
                  </span>
                </button>
              </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            </motion.div>
          </div>
        </form>

        {/* Success Card - Fades in after confetti */}
        <AnimatePresence>
          {submitPhase === 'success' && finalScore !== null && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/95 to-black/95 rounded-3xl p-8 sm:p-12 max-w-md w-full border border-white/10 shadow-2xl"
              >
                {/* Checkmark */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
                  className="flex justify-center mb-6"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-12 h-12 text-black" />
                  </div>
                </motion.div>

                {/* Success Message */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl sm:text-3xl font-bold text-white text-center mb-4"
                  style={{ fontFamily: 'var(--font-cinzel), serif' }}
                >
                  Rating Submitted!
                </motion.h2>

                {/* Final Score */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center mb-8"
                >
                  <div className="inline-block px-6 py-3 rounded-full bg-gradient-to-br from-[#FFD700]/20 to-[#FFA500]/20 border border-[#FFD700]/30">
                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FFE55C] via-[#FFD700] to-[#FFA500]">
                      {finalScore}/10
                    </div>
                  </div>
                </motion.div>

                {/* Share Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-3"
                >
                  <button
                    onClick={handleShare}
                    className="w-full py-4 rounded-full bg-gradient-to-r from-[#FFE55C] to-[#FFD700] text-black font-bold text-lg hover:shadow-lg hover:shadow-[#FFD700]/50 transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    <Share2 className="w-5 h-5" />
                    Share Your Rating
                  </button>

                  {/* Social Media Buttons */}
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleSocialShare('twitter')}
                      className="flex-1 py-3 rounded-full bg-[#1DA1F2] text-white font-semibold hover:bg-[#1a8cd8] transition-colors flex items-center justify-center gap-2"
                    >
                      <Twitter className="w-5 h-5" />
                      Twitter
                    </button>
                    <button
                      onClick={() => handleSocialShare('facebook')}
                      className="flex-1 py-3 rounded-full bg-[#1877F2] text-white font-semibold hover:bg-[#166fe5] transition-colors flex items-center justify-center gap-2"
                    >
                      <Facebook className="w-5 h-5" />
                      Facebook
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
})
