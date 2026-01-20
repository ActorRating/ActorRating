"use client"

import React, { useState, useCallback, memo, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { CheckCircle, Share2, Twitter, Facebook, Instagram, Lock, X } from 'lucide-react'
import { useUser } from '@/components/providers/SessionProvider'
import { trackRateSubmit, trackShareRating, trackFirstRatingComplete } from '@/lib/analytics'
import { haptic } from '@/lib/haptics'
import { lockScroll, unlockScroll } from '@/lib/lockScroll'

// Lotto-style number roll hook - shows rolling numbers like a slot machine
function useNumberRoll(startValue: number, endValue: number, duration: number = 300) {
  const [currentValue, setCurrentValue] = useState(startValue)
  const [isAnimating, setIsAnimating] = useState(false)
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)
  const startValueRef = useRef<number>(startValue)
  const hasAnimatedRef = useRef(false)

  useEffect(() => {
    // If values are the same (within 0.01), just set it immediately
    if (Math.abs(endValue - currentValue) < 0.01) {
      setCurrentValue(endValue)
      setIsAnimating(false)
      startValueRef.current = endValue
      hasAnimatedRef.current = true
      return
    }

    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
    }

    // Use current displayed value as start for smooth transitions
    const actualStart = currentValue
    startValueRef.current = actualStart

    setIsAnimating(true)
    const startTime = Date.now()
    startTimeRef.current = startTime
    hasAnimatedRef.current = true

    const animate = () => {
      if (!startTimeRef.current) return

      const elapsed = Date.now() - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)

      // Ease out cubic for smooth deceleration (like lotto machine)
      const easeOut = 1 - Math.pow(1 - progress, 3)

      // Calculate current value - smooth decimal increments (1.0, 1.1, 1.2, etc.)
      const current = actualStart + (endValue - actualStart) * easeOut
      
      setCurrentValue(current)

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Final value with decimal
        setCurrentValue(endValue)
        setIsAnimating(false)
        animationRef.current = null
        startValueRef.current = endValue
      }
    }

    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      setIsAnimating(false)
    }
  }, [endValue, duration])

  return { value: currentValue, isAnimating }
}

interface Performance {
  id: string
  actor: {
    id: string
    name: string
    imageUrl?: string
    slug?: string
  }
  movie: {
    id: string
    title: string
    year: number
    director?: string
    slug?: string
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
  submittedRating?: {
    id: string
    slug?: string | null
    emotionalRangeDepth: number
    characterBelievability: number
    technicalSkill: number
    screenPresence: number
    chemistryInteraction: number
  } | null
}

// Individual Slider Component - Premium Gold Design (Optimized for mobile)
const RatingSliderCard = memo(function RatingSliderCard({
  label,
  value,
  onValueChange,
  onSliderStart,
  onSliderEnd,
  disabled = false,
  touched = false,
  spotlightActive = false,
  isDemoing = false
}: {
  label: string
  value: number
  onValueChange: (value: number) => void
  onSliderStart?: () => void
  onSliderEnd?: () => void
  disabled?: boolean
  touched?: boolean
  spotlightActive?: boolean
  isDemoing?: boolean
}) {
  const [isActive, setIsActive] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const trackRef = useRef<HTMLDivElement>(null)
  const fillRef = useRef<HTMLDivElement>(null)
  const thumbRef = useRef<HTMLDivElement>(null)
  const lastHapticValueRef = useRef<number>(value)
  
  // Direction-locked touch handling state
  const touchStateRef = useRef<{
    startX: number
    startY: number
    isLocked: boolean
    currentValue: number
  } | null>(null)
  
  // Detect touch device and iOS
  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window
  const isIOS = typeof window !== 'undefined' && 
    /iPad|iPhone|iPod/.test(navigator.userAgent) && 
    !(window as any).MSStream
  
  // Update local value when prop changes (for demo)
  useEffect(() => {
    setLocalValue(value)
    lastHapticValueRef.current = value
    
    // Sync refs with current value
    if (fillRef.current && thumbRef.current) {
      const padding = 16
      const fillWidth = value === 0 ? '0px' : `calc(16px + ${value}% * (100% - 32px) / 100%)`
      const thumbLeft = `calc(16px + ${value}% * (100% - 32px) / 100%)`
      
      fillRef.current.style.width = fillWidth
      thumbRef.current.style.left = thumbLeft
    }
  }, [value])
  
  // Calculate value from touch position (no state updates during drag)
  const calculateValueFromTouch = useCallback((clientX: number): number => {
    if (!trackRef.current) return localValue
    
    const rect = trackRef.current.getBoundingClientRect()
    const padding = 16
    const usableWidth = rect.width - padding * 2
    let x = clientX - rect.left - padding
    x = Math.max(0, Math.min(usableWidth, x))
    return Math.round((x / usableWidth) * 100)
  }, [localValue])
  
  // Update thumb and fill directly via refs (no React state during drag)
  // Using left for thumb (simpler) and width for fill - direct DOM updates avoid React reconciliation
  const updateSliderVisuals = useCallback((newValue: number) => {
    if (!fillRef.current || !thumbRef.current) return
    
    const padding = 16
    const fillWidth = newValue === 0 ? '0px' : `calc(16px + ${newValue}% * (100% - 32px) / 100%)`
    const thumbLeft = `calc(16px + ${newValue}% * (100% - 32px) / 100%)`
    
    // Direct DOM updates - no React reconciliation during drag
    fillRef.current.style.width = fillWidth
    thumbRef.current.style.left = thumbLeft
    
    // Haptic feedback every 5 points (discrete, non-annoying)
    // Note: iOS doesn't support haptics, silently fails
    if (Math.abs(newValue - lastHapticValueRef.current) >= 5) {
      haptic.light()
      lastHapticValueRef.current = newValue
    }
    
    // Strong haptic on milestones
    if ([50, 75, 90, 100].includes(newValue)) {
      haptic.medium()
    }
  }, [])
  
  // Touch handlers with direction lock
  // Using native event listeners with { passive: false } for iOS compatibility
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled) return
    
    const touch = e.touches[0]
    touchStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      isLocked: false,
      currentValue: localValue
    }
    
    setIsActive(true)
    haptic.light() // Selection feedback (silently fails on iOS)
    onSliderStart?.()
  }, [disabled, localValue, onSliderStart])
  
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStateRef.current || disabled) return
    
    const touch = e.touches[0]
    const dx = Math.abs(touch.clientX - touchStateRef.current.startX)
    const dy = Math.abs(touch.clientY - touchStateRef.current.startY)
    
    // Direction lock: detect horizontal vs vertical intent
    // Only lock into slider drag if horizontal movement is dominant
    // iOS needs higher threshold (18px) due to less precise touch events
    const threshold = isIOS ? 18 : 12
    
    if (!touchStateRef.current.isLocked) {
      // Threshold: 18px for iOS, 12px for Android to determine intent
      if (dx > threshold && dx > dy) {
        // Horizontal intent confirmed - lock into slider drag
        touchStateRef.current.isLocked = true
        e.preventDefault() // Only prevent default AFTER horizontal intent confirmed
      } else if (dy > threshold) {
        // Vertical intent - abort slider interaction, allow page scroll
        touchStateRef.current = null
        setIsActive(false)
        return
      } else {
        // Not enough movement yet - wait
        return
      }
    }
    
    // Horizontal drag locked - update slider
    if (touchStateRef.current.isLocked) {
      e.preventDefault() // Prevent scroll during horizontal drag
      const newValue = calculateValueFromTouch(touch.clientX)
      touchStateRef.current.currentValue = newValue
      updateSliderVisuals(newValue) // Direct DOM update, no React state
      
      // Real-time update for score
      setLocalValue(newValue)
      onValueChange(newValue)
    }
  }, [disabled, isIOS, calculateValueFromTouch, updateSliderVisuals, onValueChange])
  
  const handleTouchEnd = useCallback(() => {
    if (!touchStateRef.current) return
    
    // Only commit value if we were locked into horizontal drag
    if (touchStateRef.current.isLocked) {
      const finalValue = touchStateRef.current.currentValue
      setLocalValue(finalValue)
      onValueChange(finalValue) // Commit final value
      haptic.medium() // Confirmation feedback (silently fails on iOS)
    }
    
    touchStateRef.current = null
    setIsActive(false)
    onSliderEnd?.()
  }, [onValueChange, onSliderEnd])
  
  // Attach native event listeners with { passive: false } for iOS
  useEffect(() => {
    if (!isTouchDevice || !trackRef.current) return
    
    const track = trackRef.current
    
    // Add event listeners with { passive: false } so preventDefault works on iOS
    track.addEventListener('touchstart', handleTouchStart, { passive: false })
    track.addEventListener('touchmove', handleTouchMove, { passive: false })
    track.addEventListener('touchend', handleTouchEnd, { passive: false })
    track.addEventListener('touchcancel', handleTouchEnd, { passive: false })
    
    return () => {
      track.removeEventListener('touchstart', handleTouchStart)
      track.removeEventListener('touchmove', handleTouchMove)
      track.removeEventListener('touchend', handleTouchEnd)
      track.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [isTouchDevice, handleTouchStart, handleTouchMove, handleTouchEnd])
  
  // Desktop input handler
  const handleInputChange = useCallback((newValue: number) => {
    setLocalValue(newValue)
      onValueChange(newValue)
  }, [onValueChange])

  return (
    <div className="space-y-3 sm:space-y-4 relative">
      {/* Label with Value */}
      <div className="flex items-center justify-between mb-3">
        <h3 
          className="text-lg sm:text-xl font-semibold text-white"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          {label}
        </h3>
        <span className="text-lg sm:text-xl font-bold text-[#FFD700]">
          {Math.round(localValue / 10)} / 10
        </span>
      </div>

      {/* Slider Container */}
      <div className="relative pt-3 pb-3">
        {/* Track Background - with padding to contain thumb at edges */}
        {/* Touch handlers attached via native listeners with { passive: false } for iOS */}
        <div
          ref={trackRef}
          className="relative h-3 bg-[#0a0a0a] rounded-full border border-white/5"
          style={{ paddingLeft: '16px', paddingRight: '16px' }}
        >
          {/* Fill - Gold gradient - Updated directly via ref during drag for smoothness */}
          {/* Using transform for better iOS compositor performance */}
          <div
            ref={fillRef}
            className="absolute top-0 left-0 h-full rounded-full will-change-[width]"
            style={{ 
              width: localValue === 0 ? '0px' : `calc(16px + ${localValue}% * (100% - 32px) / 100%)`,
              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
              boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)',
              transform: 'translate3d(0, 0, 0)', // Force GPU layer on iOS
              WebkitTransform: 'translate3d(0, 0, 0)', // iOS Safari specific
            }}
          />
          
          {/* Input for desktop + accessibility - disabled touch on mobile */}
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={localValue}
            onChange={(e) => {
              // Desktop: handle via native input
              if (!isTouchDevice) {
              handleInputChange(Number(e.target.value))
                setIsActive(true)
              }
            }}
            onMouseDown={() => {
              if (!isTouchDevice) {
              setIsActive(true)
              onSliderStart?.()
              }
            }}
            onMouseUp={() => {
              if (!isTouchDevice) {
              setIsActive(false)
              onSliderEnd?.()
              }
            }}
            onMouseLeave={() => {
              if (!isTouchDevice && isActive) {
                setIsActive(false)
                onSliderEnd?.()
              }
            }}
            disabled={disabled}
            className="absolute top-1/2 left-0 w-full h-16 sm:h-12 -translate-y-1/2 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed pointer-events-none sm:pointer-events-auto"
            style={{ 
              WebkitTapHighlightColor: 'transparent',
              paddingLeft: '16px',
              paddingRight: '16px',
            }}
            aria-label={label}
          />
          
          {/* Visible Thumb - Updated directly via ref during drag for smoothness */}
          {/* Fixed: Don't resize during drag - use visual emphasis instead to avoid breaking iOS drag gesture */}
          {/* Increased size from 28px to 36px for better mobile usability */}
          {/* Using will-change and translate3d for iOS GPU acceleration */}
          <div
            ref={thumbRef}
            className="absolute top-1/2 rounded-full shadow-lg pointer-events-none will-change-[left]"
            style={{
              left: `calc(16px + ${localValue}% * (100% - 32px) / 100%)`,
              transform: 'translate3d(-50%, -50%, 0)',
              WebkitTransform: 'translate3d(-50%, -50%, 0)',
              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
              width: '36px',
              height: '36px',
              boxShadow: isActive
                ? '0 0 28px rgba(255, 215, 0, 0.8), 0 4px 12px rgba(0, 0, 0, 0.4)'
                : '0 0 24px rgba(255, 215, 0, 0.6), 0 4px 10px rgba(0, 0, 0, 0.3)',
            }}
          />
        </div>
      </div>

      {/* Quality Labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>Weak</span>
        <span>Exceptional</span>
    </div>
    </div>
  )
})

export const PerformanceRatingClientWrapper = memo(function PerformanceRatingClientWrapper({
  performance,
  onSubmit,
  submitting = false,
  initialRating,
  onSuccess,
  submittedRating: externalSubmittedRating
}: PerformanceRatingClientWrapperProps) {
  const router = useRouter()
  const user = useUser()
  
  // Check if user has rated before
  const [hasRatedBefore, setHasRatedBefore] = useState<boolean | null>(null)
  
  // Auto-demo first slider on first load
  const [isDemoing, setIsDemoing] = useState(false)
  const [demoValue, setDemoValue] = useState(0)
  const hasDemoedRef = useRef(false)
  const firstSliderRef = useRef<HTMLDivElement>(null)
  const animationFrameRef = useRef<number | null>(null)
  
  // Check if user has rated before
  useEffect(() => {
    if (!user) {
      setHasRatedBefore(false)
      return
    }
    
    const checkUserRatings = async () => {
      try {
        const res = await fetch('/api/ratings/me', { cache: 'no-store' })
        if (res.ok) {
          const ratings = await res.json()
          setHasRatedBefore(Array.isArray(ratings) && ratings.length > 0)
        } else {
          setHasRatedBefore(false)
        }
      } catch (error) {
        console.error('Failed to check user ratings:', error)
        setHasRatedBefore(false)
      }
    }
    
    checkUserRatings()
  }, [user])
  
  // Auto-demo first slider after first load - buttery smooth animation
  useEffect(() => {
    // Only run once on mount
    if (hasDemoedRef.current) return
    // Skip demo if user has rated before
    if (hasRatedBefore === true) {
      hasDemoedRef.current = true
      return
    }
    // Wait until we know if user has rated before
    if (hasRatedBefore === null) return
    
    hasDemoedRef.current = true
    
    let scrollTimer: NodeJS.Timeout | null = null
    let animationStartTimer: NodeJS.Timeout | null = null
    let holdTimer: NodeJS.Timeout | null = null
    
    // Wait for next frame to ensure DOM is ready
    requestAnimationFrame(() => {
      // Wait a tiny bit after first load, then scroll to first slider
      scrollTimer = setTimeout(() => {
      // Smooth scroll to first slider
      const scrollToSlider = () => {
        if (firstSliderRef.current) {
          firstSliderRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center',
            inline: 'nearest'
          })
          return true
        }
        return false
      }
      
      // Try to scroll, retry if ref not ready
      if (!scrollToSlider()) {
        // Retry after a short delay if ref not ready
        setTimeout(scrollToSlider, 100)
      }
      
      // Start demo animation after scroll starts
      animationStartTimer = setTimeout(() => {
        setIsDemoing(true)
        
        // Buttery smooth animation using requestAnimationFrame timestamp
        const duration = 2000 // 2 seconds for smooth movement
        const startValue = 0
        const endValue = 75
        
        // Easing function for buttery smooth motion (ease-in-out cubic)
        const easeInOutCubic = (t: number): number => {
          return t < 0.5 
            ? 4 * t * t * t 
            : 1 - Math.pow(-2 * t + 2, 3) / 2
        }
        
        let startTime: number | null = null
        
        const animate = (timestamp: number) => {
          if (startTime === null) {
            startTime = timestamp
          }
          
          const elapsed = timestamp - startTime
          const progress = Math.min(elapsed / duration, 1)
          const eased = easeInOutCubic(progress)
          const currentValue = startValue + (endValue - startValue) * eased
          
          // Round to 1 decimal place to avoid long decimals in display
          setDemoValue(Number(currentValue.toFixed(1)))
          
          if (progress < 1) {
            animationFrameRef.current = requestAnimationFrame(animate)
          } else {
            // Hold at 75 for 150ms, then smoothly return to 0
            holdTimer = setTimeout(() => {
              let returnStartTime: number | null = null
              const returnDuration = 1500
              
              const returnAnimate = (timestamp: number) => {
                if (returnStartTime === null) {
                  returnStartTime = timestamp
                }
                
                const returnElapsed = timestamp - returnStartTime
                const returnProgress = Math.min(returnElapsed / returnDuration, 1)
                const returnEased = easeInOutCubic(returnProgress)
                const returnValue = endValue - (endValue - startValue) * returnEased
                
                // Round to 1 decimal place to avoid long decimals in display
                setDemoValue(Number(returnValue.toFixed(1)))
                
                if (returnProgress < 1) {
                  animationFrameRef.current = requestAnimationFrame(returnAnimate)
                } else {
                  setIsDemoing(false)
                  setDemoValue(0)
                }
              }
              animationFrameRef.current = requestAnimationFrame(returnAnimate)
            }, 150) // Hold at 75 for 150ms
          }
        }
        
        animationFrameRef.current = requestAnimationFrame(animate)
      }, 600) // Wait 600ms after scroll starts
      }, 550) // Wait 550ms after first load
    })
    
    return () => {
      if (scrollTimer) clearTimeout(scrollTimer)
      if (animationStartTimer) clearTimeout(animationStartTimer)
      if (holdTimer) clearTimeout(holdTimer)
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
        animationFrameRef.current = null
      }
    }
  }, [hasRatedBefore]) // Run when hasRatedBefore changes
  
  // Success animation states
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'loading' | 'checkmark' | 'success'>(
    externalSubmittedRating ? 'success' : 'idle'
  )
  const [finalScore, setFinalScore] = useState<number | null>(null)
  const [hasAnimatedOnce, setHasAnimatedOnce] = useState(false)
  
  // Set final score if external submitted rating is provided
  useEffect(() => {
    if (externalSubmittedRating) {
      const score = (
        externalSubmittedRating.emotionalRangeDepth * 0.25 +
        externalSubmittedRating.characterBelievability * 0.25 +
        externalSubmittedRating.technicalSkill * 0.20 +
        externalSubmittedRating.screenPresence * 0.15 +
        externalSubmittedRating.chemistryInteraction * 0.15
      ) / 10
      setFinalScore(Number(score.toFixed(1)))
    }
  }, [externalSubmittedRating])

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
  const isDraggingRef = useRef<boolean>(false)
  const [sliderReleaseTime, setSliderReleaseTime] = useState<number>(0)
  
  // Sticky score pill state
  const [isSticky, setIsSticky] = useState(false)

  // Calculate average of 5 sliders, convert to 0-10 scale
  const totalScoreOutOf10 = useMemo(() => {
    const sliders = [
      Number(isDemoing ? demoValue : emotionalRangeDepth) || 0,
      Number(characterBelievability) || 0,
      Number(technicalSkill) || 0,
      Number(screenPresence) || 0,
      Number(chemistryInteraction) || 0
    ]
    
    // Ensure all values are valid numbers between 0-100
    const validSliders = sliders.filter(v => !isNaN(v) && v >= 0 && v <= 100)
    if (validSliders.length === 0) return 0
    
    const sum = validSliders.reduce((a, b) => a + b, 0)
    const average = sum / validSliders.length
    const totalScore = average / 10
    
    // Clamp between 0 and 10
    const clamped = Math.max(0, Math.min(10, totalScore))
    return Number(clamped.toFixed(1)) // Round to 1 decimal place
  }, [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction, isDemoing, demoValue])

  // Direct score update - no animation for instant mobile response
  const animatedScore = totalScoreOutOf10
  const isAnimating = false
  
  // Update previous score when animation completes
  useEffect(() => {
    if (!isAnimating) {
      previousScoreRef.current = totalScoreOutOf10
    }
  }, [isAnimating, totalScoreOutOf10])

  // Sticky score pill - IntersectionObserver to detect when top of score pill touches top of screen
  useEffect(() => {
    if (!scoreRef.current || submitPhase === 'success') {
      setIsSticky(false)
      return
    }

    const checkPosition = () => {
      if (!scoreRef.current) return
      const rect = scoreRef.current.getBoundingClientRect()
      // Show sticky when top edge of main pill reaches or passes top of viewport
      setIsSticky(rect.top <= 0)
    }

    // Check on scroll
    const handleScroll = () => {
      checkPosition()
    }

    // Initial check
    checkPosition()

    // Use IntersectionObserver for efficient updates
    const observer = new IntersectionObserver(
      (entries) => {
        // Check the actual position to see if top edge has reached top
        checkPosition()
      },
      {
        root: null,
        rootMargin: '0px',
        threshold: [0, 1],
      }
    )

    observer.observe(scoreRef.current)
    
    // Also listen to scroll for more precise updates
    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener('scroll', handleScroll)
    }
  }, [submitPhase])

  const allSlidersTouched = useMemo(() => {
    return Object.values(touchedSliders).every(touched => touched)
  }, [touchedSliders])

  const handleSliderChange = useCallback((key: keyof typeof touchedSliders, value: number) => {
    const wasTouched = touchedSliders[key]
    setTouchedSliders(prev => ({ ...prev, [key]: true }))
    lastInteractionTime.current = Date.now()
    
    // Only clear timeout if this slider wasn't touched before (first touch)
    // This prevents resetting the animation timer when adjusting already-touched sliders
    if (!wasTouched) {
      if (spotlightTimeoutRef.current) {
        clearTimeout(spotlightTimeoutRef.current)
        spotlightTimeoutRef.current = null
      }
      // Only reset spotlight phase if not already animating
      if (spotlightPhase === 'none') {
        setSpotlightPhase('none')
      }
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
  }, [touchedSliders, spotlightPhase])

  const handleSliderStart = useCallback(() => {
    isDraggingRef.current = true
    // Clear any existing timeout when starting to drag
    if (spotlightTimeoutRef.current) {
      clearTimeout(spotlightTimeoutRef.current)
      spotlightTimeoutRef.current = null
    }
  }, [])

  const handleSliderEnd = useCallback(() => {
    isDraggingRef.current = false
    const releaseTime = Date.now()
    lastInteractionTime.current = releaseTime
    setSliderReleaseTime(releaseTime) // Trigger useEffect
  }, [])

  // Function to trigger spotlight animation
  const triggerSpotlightAnimation = useCallback(() => {
    if (!allSlidersTouched) return
    if (spotlightPhase !== 'none') return // Don't restart if already animating
    if (isDraggingRef.current) return // Don't trigger if still dragging
    if (hasAnimatedOnce) return // Only animate once

    // Mark as animated immediately to prevent re-triggering
    setHasAnimatedOnce(true)

    // Effect 1: Score pulse
    setSpotlightPhase('score')
    
    // Effect 2: Scroll to score (after short delay)
    setTimeout(() => {
      scoreRef.current?.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      })
    }, 200)
    
    // Effect 3: Button glow (after score animation completes)
    setTimeout(() => {
      setSpotlightPhase('button')
      
      // Scroll to button
      setTimeout(() => {
        buttonRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        })
      }, 200)
    }, 1200)
  }, [allSlidersTouched, spotlightPhase, hasAnimatedOnce])

  // ============================================================================
  // SPOTLIGHT ANIMATION AFTER LAST SLIDER - COMMENTED OUT (EASILY RETRIEVABLE)
  // ============================================================================
  // This animation triggers after all sliders are touched and the last one is released.
  // It shows a pulse on the score, scrolls to it, then shows a glow on the submit button.
  // To re-enable: Uncomment the useEffect below and ensure triggerSpotlightAnimation is defined.
  // ============================================================================
  
  // Trigger spotlight animation after slider release (only when all sliders are touched)
  // useEffect(() => {
  //   // Only proceed if all sliders are touched
  //   if (!allSlidersTouched) return
  //   // Don't restart if already animating or already animated
  //   if (spotlightPhase !== 'none' || hasAnimatedOnce) return
  //   // Don't trigger if still dragging
  //   if (isDraggingRef.current) return
  //   // Need a slider release to trigger
  //   if (sliderReleaseTime === 0) return

  //   // Clear any existing timeout
  //   if (spotlightTimeoutRef.current) {
  //     clearTimeout(spotlightTimeoutRef.current)
  //     spotlightTimeoutRef.current = null
  //   }

  //   // Trigger animation after a short delay to ensure slider release is complete
  //   spotlightTimeoutRef.current = setTimeout(() => {
  //     // Double-check conditions before triggering
  //     if (
  //       allSlidersTouched &&
  //       !isDraggingRef.current && 
  //       spotlightPhase === 'none' && 
  //       !hasAnimatedOnce
  //     ) {
  //       triggerSpotlightAnimation()
  //     }
  //   }, 150)

  //   return () => {
  //     if (spotlightTimeoutRef.current) {
  //       clearTimeout(spotlightTimeoutRef.current)
  //       spotlightTimeoutRef.current = null
  //     }
  //   }
  // }, [allSlidersTouched, spotlightPhase, sliderReleaseTime, triggerSpotlightAnimation, hasAnimatedOnce])

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

    // Haptic feedback on submit
    haptic.medium()

    try {
      // Start loading animation AFTER attempting submit (so modal can show first if not signed in)
      setSubmitPhase('loading')
      
      // Unlock scroll in case it was locked from slider
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
        document.body.style.touchAction = ''
      }
      
      const startTime = Date.now()
      
      // Wait for API call
      await onSubmit(ratingData)
      
      const elapsed = Date.now() - startTime
      
      // 800ms: Morph to checkmark (ensure minimum 800ms total)
      const checkmarkDelay = Math.max(0, 800 - elapsed)
      setTimeout(() => {
        setSubmitPhase('checkmark')
      }, checkmarkDelay)
      
      // 1300ms: Fade transitions (ensure minimum 1300ms total)
      const successDelay = Math.max(0, 1300 - elapsed)
      setTimeout(() => {
        setSubmitPhase('success')
        
        // Lock body scroll when success card shows (prevent background scroll)
        if (typeof document !== 'undefined') {
          const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
          document.body.style.overflow = 'hidden'
          document.body.style.paddingRight = `${scrollbarWidth}px`
        }
        
        // Calculate overall score for tracking
        const overallScore = (
          ratingData.emotionalDepth +
          ratingData.believability +
          ratingData.technicalSkill +
          ratingData.screenPresence +
          ratingData.chemistry
        ) / 5 / 10
        
        // Track rating submission (MOST IMPORTANT)
        trackRateSubmit(
          performance.actor.name,
          performance.movie.title,
          Number(overallScore.toFixed(1))
        )
        
        // Track first rating completion (only once per user)
        trackFirstRatingComplete()
        
        if (onSuccess) {
          onSuccess(ratingData)
        }
      }, successDelay)
      
    } catch (err) {
      // Handle intentional rejections (e.g., when user is not signed in) gracefully
      // Check if this is the expected rejection for unsigned users
      const errorMessage = err instanceof Error ? err.message : String(err || 'Unknown error')
      const isUserNotSignedIn = err instanceof Error && err.message === 'USER_NOT_SIGNED_IN'
      
      if (isUserNotSignedIn) {
        // For unsigned users, the modal will be shown by the parent component
        // Reset phase immediately so button is clickable again
        setSubmitPhase('idle')
        // Unlock scroll
        if (typeof document !== 'undefined') {
          document.body.style.overflow = ''
          document.body.style.touchAction = ''
        }
      } else {
        // For actual errors, log them
        console.error('Failed to submit rating:', errorMessage, err)
        setSubmitPhase('idle')
        // Unlock scroll
        if (typeof document !== 'undefined') {
          document.body.style.overflow = ''
          document.body.style.touchAction = ''
        }
      }
    }
  }, [emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction, onSubmit, allSlidersTouched, onSuccess, performance.actor.name, performance.movie.title])

  // Share functionality - use rating slug if available
  const shareUrl = typeof window !== 'undefined' 
    ? (externalSubmittedRating?.slug 
        ? `${window.location.origin}/r/${externalSubmittedRating.slug}`
        : externalSubmittedRating?.id
        ? `${window.location.origin}/r/${externalSubmittedRating.id}`
        : (performance.actor.slug && performance.movie.slug
            ? `${window.location.origin}/rate/${performance.movie.slug}/${performance.actor.slug}`
            : `${window.location.origin}/rate?actor=${performance.actor.id}&movie=${performance.movie.id}`))
    : ''
  
  // Check if URL is in slug format (/rate/[movie-slug]/[actor-slug])
  const isSlugFormat = shareUrl.includes('/rate/') && !shareUrl.includes('?')
  
  // Build share text - include URL only if it's in slug format, always add ActorRating
  const shareText = finalScore !== null 
    ? `I gave ${performance.actor.name}'s performance in "${performance.movie.title}" a ${finalScore}/10. What's your rating?${isSlugFormat ? ` ${shareUrl}` : ''} — ActorRating`
    : `Rate ${performance.actor.name}'s performance in "${performance.movie.title}"${isSlugFormat ? ` ${shareUrl}` : ''} — ActorRating`

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Rating: ${performance.actor.name} in ${performance.movie.title}`,
          text: shareText,
          url: shareUrl,
        })
        // Track native share
        trackShareRating('native')
      } catch (err) {
        // User cancelled or error
        console.log('Share cancelled')
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(shareText)
      alert('Link copied to clipboard!')
      // Track native share (clipboard fallback)
      trackShareRating('native')
    }
  }

  const handleSocialShare = async (platform: 'twitter' | 'facebook' | 'instagram') => {
    // Generate shareable image
    try {
      // Use the OG image endpoint to generate a shareable image
      const imageUrl = `${window.location.origin}/api/og?ratingId=${performance.actor.id}-${performance.movie.id}&size=og&actorName=${encodeURIComponent(performance.actor.name)}&movieTitle=${encodeURIComponent(performance.movie.title)}&score=${finalScore}`
      
      const encodedText = encodeURIComponent(shareText)
      const encodedUrl = encodeURIComponent(shareUrl)
      
      if (platform === 'twitter') {
        // Twitter doesn't support custom images in share dialog, but we can include the image URL in the text
        window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank')
        trackShareRating('twitter')
      } else if (platform === 'facebook') {
        // Facebook can use og:image meta tags, but for direct sharing we use the URL
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank')
        trackShareRating('facebook')
      } else if (platform === 'instagram') {
        // Instagram doesn't support direct URL sharing, so we copy the image URL to clipboard
        // and show instructions to the user
        const imageUrl = `${window.location.origin}/api/og?ratingId=${performance.actor.id}-${performance.movie.id}&size=feed&actorName=${encodeURIComponent(performance.actor.name)}&movieTitle=${encodeURIComponent(performance.movie.title)}&score=${finalScore}`
        await navigator.clipboard.writeText(imageUrl)
        alert('Share image URL copied to clipboard! Open Instagram and paste it in your story or post.')
        trackShareRating('instagram')
      }
    } catch (err) {
      console.error('Failed to generate share image:', err)
      // Fallback to text-only share
      const encodedText = encodeURIComponent(shareText)
      const encodedUrl = encodeURIComponent(shareUrl)
      if (platform === 'twitter') {
        window.open(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`, '_blank')
        trackShareRating('twitter')
      } else if (platform === 'facebook') {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank')
        trackShareRating('facebook')
      } else if (platform === 'instagram') {
        const imageUrl = `${window.location.origin}/api/og?ratingId=${performance.actor.id}-${performance.movie.id}&size=feed&actorName=${encodeURIComponent(performance.actor.name)}&movieTitle=${encodeURIComponent(performance.movie.title)}&score=${finalScore}`
        navigator.clipboard.writeText(imageUrl).then(() => {
          alert('Share image URL copied to clipboard! Open Instagram and paste it in your story or post.')
          trackShareRating('instagram')
        }).catch(() => {
          alert('Failed to copy image URL. Please try again.')
        })
      }
    }
  }

  const handleContinueRating = () => {
    // Navigate to actor's page
    router.push(`/actors/${performance.actor.id}`)
  }

  return (
    <div className="min-h-screen bg-black relative overflow-x-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-[#FFC800]/20 rounded-full blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-[#FFB000]/15 rounded-full blur-[150px]" />
      </div>



      <div className={`relative max-w-[900px] mx-auto px-4 sm:px-6 pb-16 sm:pb-20 md:pb-24 ${user ? 'pt-20 sm:pt-20 md:pt-24' : 'pt-24 sm:pt-24 md:pt-28'}`}>

        {/* Header Section - Mobile optimized - No animations on mobile to prevent disappearing */}
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0 }}
          className="text-center mb-8 sm:mb-12 md:mb-16"
        >
          {/* Actor Name - Primary Focus, Largest Text, White */}
          <h1 
            id="actor-name-header" 
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-3 sm:mb-4 tracking-tight px-2 text-white"
            style={{
              fontFamily: 'var(--font-cinzel), serif',
            }}
          >
            {performance.actor.name}
          </h1>
          
          {/* Movie Title - Clean, non-italic styling */}
          <div className="mb-2 sm:mb-3 px-2">
            <h2 
              className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-semibold mb-1 sm:mb-1.5 tracking-tight"
              style={{
                background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                fontFamily: 'var(--font-geist-sans), sans-serif',
                lineHeight: '1.3',
              }}
            >
              {performance.movie.title}
            </h2>
            <p 
              className="text-lg sm:text-xl md:text-2xl text-[#a1a1aa] font-medium"
              style={{
                fontFamily: 'var(--font-geist-sans), sans-serif',
              }}
            >
              {performance.movie.year}
            </p>
          </div>
          
          {/* Role/Comment */}
          {performance.comment && (
            <p className="text-sm sm:text-base text-[#a1a1aa] px-2">{performance.comment}</p>
          )}
        </motion.div>

        <form onSubmit={handleSubmit}>
          <div className="relative">
            {/* Sticky Score Display - Appears at top when main score pill reaches top of screen */}
            <AnimatePresence>
              {isSticky && submitPhase !== 'success' && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
                  className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] w-[220px] sm:w-[240px] md:w-[260px]"
                  style={{ 
                    willChange: 'transform, opacity',
                    transform: 'translate3d(-50%, 0, 0)',
                    WebkitTransform: 'translate3d(-50%, 0, 0)',
                  }}
                >
                  <div 
                    className="relative backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] px-5 sm:px-6 md:px-7 py-4 sm:py-5 md:py-6 shadow-2xl transition-all duration-150 overflow-hidden border border-white/10"
                    style={{
                      width: '100%',
                      background: 'rgba(26, 26, 26, 0.95)',
                      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <div className="relative text-center z-10">
                      <div 
                        className="font-black mb-1 flex items-baseline justify-center gap-1 sm:gap-1.5 min-h-[3rem] sm:min-h-[3.5rem] md:min-h-[4rem]"
                        style={{
                          fontFamily: 'var(--font-geist-sans), sans-serif',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        <div className="relative inline-block overflow-visible min-w-[70px] sm:min-w-[80px] md:min-w-[90px] h-[3rem] sm:h-[3.5rem] md:h-[4rem] leading-[3rem] sm:leading-[3.5rem] md:leading-[4rem]">
                          <span
                            className="inline-block text-4xl sm:text-5xl md:text-6xl transition-all duration-75 ease-linear"
                            style={{
                              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                              lineHeight: '1.1',
                              verticalAlign: 'baseline',
                              paddingBottom: '0.1em',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {isAnimating ? animatedScore.toFixed(1) : totalScoreOutOf10.toFixed(1)}
                          </span>
                        </div>
                        <span 
                          className="text-lg sm:text-xl md:text-2xl text-[#a1a1aa] leading-none"
                          style={{
                            verticalAlign: 'baseline',
                          }}
                        >
                          /10
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-[#d4d4d8] font-semibold tracking-widest uppercase">Your Score</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Score Display - Responsive size, prevent cutoff, optimized for mobile */}
            <AnimatePresence>
              {submitPhase !== 'success' && (
            <motion.div
                  ref={scoreRef}
              initial={{ opacity: 0, y: -30, scale: 0.95 }}
                  animate={{ 
                    opacity: isSticky ? 0 : 1, 
                    y: 0,
                    scale: 1
                  }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ 
                    delay: 0, 
                    duration: 0.2,
                    ease: [0.4, 0, 0.2, 1]
                  }}
                  className="relative mx-auto mb-8 z-50 w-[260px] sm:w-[280px] md:w-[300px]"
                  style={{ marginTop: '0', marginBottom: '2rem', willChange: 'transform, opacity' }}
            >
              <div 
                className="relative backdrop-blur-xl rounded-[2.5rem] sm:rounded-[3rem] px-7 sm:px-8 md:px-10 py-6 sm:py-7 md:py-8 shadow-2xl transition-all duration-700 overflow-hidden"
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
                      className="absolute inset-0 pointer-events-none rounded-[2.5rem] sm:rounded-[3rem]"
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
                      fontFamily: 'var(--font-geist-sans), sans-serif',
                      fontVariantNumeric: 'tabular-nums',
                      position: 'relative',
                    }}
                  >
                    {/* Optimized score display - smooth updates on mobile */}
                    <div className="relative inline-block overflow-visible min-w-[70px] sm:min-w-[90px] h-[3.5rem] sm:h-[4.5rem] leading-[3.5rem] sm:leading-[4.5rem]">
                        <span
                          className="inline-block text-5xl sm:text-5xl md:text-6xl lg:text-7xl transition-all duration-75 ease-linear"
                          style={{
                            background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            lineHeight: '1',
                            verticalAlign: 'baseline',
                            willChange: 'transform',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {isAnimating ? animatedScore.toFixed(1) : totalScoreOutOf10.toFixed(1)}
                        </span>
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

            {/* Rating Card - Extra round corners, mobile optimized - No animations on mobile */}
            <AnimatePresence>
              {submitPhase !== 'success' && (
            <motion.div
              initial={{ opacity: 1, y: 0 }}
                  animate={{ 
                    opacity: 1,
                    y: 0,
                  }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: 0, duration: 0 }}
                  className="relative rounded-[2.5rem] sm:rounded-[3rem] p-5 sm:p-6 md:p-8 lg:p-12 py-8 sm:py-10 md:py-12 space-y-5 sm:space-y-6 md:space-y-8 lg:space-y-10 border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/95 to-black/95 backdrop-blur-2xl overflow-hidden w-full max-w-full mx-auto"
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
              
              {/* Instructions */}
              <div className="text-center mb-6 sm:mb-8 max-w-[600px] mx-auto">
                <p className="text-sm sm:text-base text-[#a3a3a3] font-light">
                  Each criterion is scored individually. Final score is the average of all five.
                </p>
              </div>
              
              {/* Sliders - Mobile optimized spacing, consistent width */}
              {/* touch-action: pan-y on parent allows vertical scroll while slider handles horizontal touches */}
              <div 
                className="space-y-6 sm:space-y-8 relative z-10 w-full max-w-[600px] sm:max-w-[600px] mx-auto pb-4"
                style={{
                  touchAction: 'pan-y', // Allow vertical scrolling on parent, slider handles horizontal
                  opacity: 1,
                  visibility: 'visible',
                }}
              >
                <div className="relative" ref={firstSliderRef}>
                  <RatingSliderCard 
                    label="Emotional Impact" 
                    value={isDemoing ? demoValue : emotionalRangeDepth} 
                    onValueChange={(v) => {
                      if (!isDemoing) {
                        handleSliderChange('emotionalRangeDepth', v)
                      }
                    }}
                    onSliderStart={handleSliderStart}
                    onSliderEnd={handleSliderEnd}
                    disabled={submitting || isDemoing}
                    touched={touchedSliders.emotionalRangeDepth}
                    spotlightActive={spotlightPhase !== 'none'}
                    isDemoing={isDemoing}
                  />
                </div>
                
                <RatingSliderCard 
                  label="Character Depth" 
                  value={characterBelievability} 
                  onValueChange={(v) => handleSliderChange('characterBelievability', v)}
                  onSliderStart={handleSliderStart}
                  onSliderEnd={handleSliderEnd}
                  disabled={submitting}
                  touched={touchedSliders.characterBelievability}
                  spotlightActive={spotlightPhase !== 'none'}
                />
                
                <RatingSliderCard 
                  label="Technical Skill" 
                  value={technicalSkill} 
                  onValueChange={(v) => handleSliderChange('technicalSkill', v)}
                  onSliderStart={handleSliderStart}
                  onSliderEnd={handleSliderEnd}
                  disabled={submitting}
                  touched={touchedSliders.technicalSkill}
                  spotlightActive={spotlightPhase !== 'none'}
                />
                
                <RatingSliderCard 
                  label="Screen Presence" 
                  value={screenPresence} 
                  onValueChange={(v) => handleSliderChange('screenPresence', v)}
                  onSliderStart={handleSliderStart}
                  onSliderEnd={handleSliderEnd}
                  disabled={submitting}
                  touched={touchedSliders.screenPresence}
                  spotlightActive={spotlightPhase !== 'none'}
                />
                
                <RatingSliderCard 
                  label="Originality" 
                  value={chemistryInteraction} 
                  onValueChange={(v) => handleSliderChange('chemistryInteraction', v)}
                  onSliderStart={handleSliderStart}
                  onSliderEnd={handleSliderEnd}
                  disabled={submitting}
                  touched={touchedSliders.chemistryInteraction}
                  spotlightActive={spotlightPhase !== 'none'}
                />
              </div>

              {/* Submit Button with white light sweep - Mobile optimized, never blurred or darkened */}
              <div 
                className="pt-4 sm:pt-6 relative max-w-[600px] mx-auto"
                style={{
                  filter: 'blur(0px)',
                  opacity: 1,
                  visibility: 'visible',
                  zIndex: 60,
                }}
              >
                <motion.button
                  ref={buttonRef}
                  type="submit"
                  disabled={!allSlidersTouched || submitting}
                  className="group w-full py-5 sm:py-6 md:py-7 text-base sm:text-lg md:text-xl font-bold rounded-full tracking-wider uppercase relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed"
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
                  whileHover={allSlidersTouched && !submitting ? {
                    scale: 1.02,
                  } : {}}
                  whileTap={allSlidersTouched && !submitting ? {
                    scale: 0.98,
                  } : {}}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
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
                </motion.button>
              </div>
            </motion.div>
              )}
            </AnimatePresence>
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
              className="fixed inset-0 z-[9999] flex items-center justify-center p-4 pt-8 sm:pt-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
              style={{ 
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
              }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/95 to-black/95 rounded-[2.5rem] sm:rounded-[3rem] p-6 sm:p-8 md:p-8 lg:p-10 max-w-md md:max-w-md lg:max-w-lg w-[calc(100%-2rem)] sm:w-full max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl relative mx-auto"
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
                {/* Close Button */}
                <button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    // Unlock body scroll when closing
                    if (typeof document !== 'undefined') {
                      document.body.style.overflow = ''
                      document.body.style.paddingRight = ''
                    }
                    router.push('/dashboard')
                  }}
                  className="absolute top-3 right-3 z-[100] text-gray-400 hover:text-white transition-colors cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                  aria-label="Close and go to dashboard"
                >
                  <div className="w-8 h-8 rounded-full bg-gray-500/20 flex items-center justify-center hover:bg-gray-500/30 transition-colors pointer-events-auto">
                    <X className="w-4 h-4 pointer-events-none" />
                  </div>
                </button>
                {/* Checkmark */}
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.3 }}
                  className="flex justify-center mb-3 sm:mb-4 md:mb-5 pt-1"
                >
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-[#FFD700] to-[#FFA500] rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-10 h-10 md:w-12 md:h-12 text-black" />
                  </div>
                </motion.div>

                {/* Success Message */}
                <motion.h2
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl sm:text-3xl md:text-3xl font-bold text-white text-center mb-3 sm:mb-4 md:mb-5"
                  style={{ fontFamily: 'var(--font-cinzel), serif' }}
                >
                  Rating Submitted!
                </motion.h2>

                {/* Final Score - Matching rate page style */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center mb-4 sm:mb-5 md:mb-6"
                >
                  <div 
                    className="relative backdrop-blur-xl rounded-[2.5rem] sm:rounded-[3rem] px-7 sm:px-8 py-6 sm:py-7 shadow-2xl mx-auto"
                    style={{
                      width: '240px',
                      minHeight: '130px',
                      background: 'rgba(26, 26, 26, 0.8)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.1), inset 0 -1px 0 rgba(0, 0, 0, 0.3)',
                      transform: 'perspective(1000px) rotateX(2deg) translateZ(20px)',
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    <div className="relative text-center z-10">
                      <div 
                        className="font-black mb-2 flex items-baseline justify-center gap-1 sm:gap-1.5 min-h-[3.5rem] sm:min-h-[4.5rem] pt-2 pb-2"
                        style={{
                          fontFamily: 'var(--font-geist-sans), sans-serif',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        <span
                          className="inline-block text-5xl sm:text-6xl md:text-7xl"
                          style={{
                            background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            lineHeight: '1',
                            verticalAlign: 'baseline',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {finalScore}
                        </span>
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

                {/* Share Button */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="space-y-3 sm:space-y-3 md:space-y-4"
                >
                  <button
                    onClick={handleShare}
                    className="w-full py-3 sm:py-4 md:py-5 text-base sm:text-lg md:text-xl font-bold rounded-full transition-all duration-500 tracking-wider uppercase relative overflow-hidden"
                    style={{
                      background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                      color: '#000000',
                      boxShadow: '0 0 20px rgba(255, 215, 0, 0.25), 0 10px 30px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <Share2 className="w-5 h-5 inline-block mr-2" />
                    Share Your Rating
                  </button>

                  {/* Social Media Buttons - Round on all screens */}
                  <div className="flex gap-3 sm:gap-4 justify-center">
                    <button
                      onClick={() => handleSocialShare('twitter')}
                      className="w-12 h-12 rounded-full bg-[#1DA1F2] text-white font-semibold hover:bg-[#1a8cd8] transition-colors flex items-center justify-center"
                      title="Share on Twitter"
                    >
                      <Twitter className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleSocialShare('facebook')}
                      className="w-12 h-12 rounded-full bg-[#1877F2] text-white font-semibold hover:bg-[#166fe5] transition-colors flex items-center justify-center"
                      title="Share on Facebook"
                    >
                      <Facebook className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleSocialShare('instagram')}
                      className="w-12 h-12 rounded-full bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#FCB045] text-white font-semibold hover:opacity-90 transition-opacity flex items-center justify-center"
                      title="Share on Instagram"
                    >
                      <Instagram className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Rate Another Button */}
                  <button
                    onClick={handleContinueRating}
                    className="w-full py-3 sm:py-4 rounded-full bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors border border-white/20"
                  >
                    Rate Another
                  </button>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  )
})
