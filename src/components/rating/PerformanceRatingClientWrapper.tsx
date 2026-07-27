"use client"

import React, { useState, useCallback, memo, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle, Share2, Star, Lock, ArrowRight, ChevronRight, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react'
import { useUser } from '@/components/providers/SessionProvider'
import { trackRateSubmit, trackShareRating, trackFirstRatingComplete } from '@/lib/analytics'
import { haptic } from '@/lib/haptics'
import { getLevelProgress, getUserBadges, type BadgeConfig } from '@/lib/badges'
import { Badge } from '@/components/badges/Badge'
import { getActorUrl, getMovieUrl } from '@/lib/slugHelper'
import { MoviePoster } from '@/components/ui/MoviePoster'
import { ActorHeadshot } from '@/components/ui/ActorHeadshot'
import { upgradeActorImageRes } from '@/lib/tmdb'
import { ProgressModal } from '@/components/dashboard/ProgressModal'
import { ProgressBar } from '@/components/badges/ProgressBar'
import { GUEST_RATING_LIMIT, readGuestRatingsCount } from '@/hooks/useGuestRatings'
import { fetchGuestSuccessRecommendations, type SuccessCarouselPerf } from '@/lib/guest-success-recommendations'
import { SuccessRateAnotherCarousel } from '@/components/rating/SuccessRateAnotherCarousel'
import { COMMENT_MAX_LENGTH } from '@/lib/validation/ratingComment'
import { PerformanceReviewsSection } from '@/components/rating/PerformanceReviewsSection'

const GOLD = 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)'
const DISPLAY = 'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif'

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
    posterUrl?: string | null
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
    comment?: string
    isSpoiler?: boolean
  }) => Promise<void>
  submitting?: boolean
  initialRating?: {
    emotionalDepth?: number
    technicalSkill?: number
    believability?: number
    screenPresence?: number
    chemistry?: number
    comment?: string
    isSpoiler?: boolean
  }
  onSuccess?: (ratingData: {
    emotionalDepth: number
    technicalSkill: number
    believability: number
    screenPresence: number
    chemistry: number
    comment?: string
    isSpoiler?: boolean
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
  communityAvg10?: number | null
  communityRatingCount?: number | null
  communityDimensions?: {
    emotionalRangeDepth: number | null
    characterBelievability: number | null
    technicalSkill: number | null
    screenPresence: number | null
    chemistryInteraction: number | null
  } | null
  /** TMDB movie vote_average (0–10) seeded onto this performance — never merge with community. */
  seededAggregateScore?: number | null
  movieCast?: Array<{
    actorId: string
    actorName: string
    actorSlug: string | null
    actorImageUrl: string | null
    movieSlug: string | null
  }>
  /** Guest-only: opens momentum signup modal in context (no full-page navigation). */
  onGuestMomentumSignup?: (payload: {
    emotionalDepth: number
    believability: number
    technicalSkill: number
    screenPresence: number
    chemistry: number
    actorId: string
    movieId: string
    actorName: string
    movieTitle: string
    movieYear: number
    comment?: string
  }) => void
}

const THRESHOLD_IN_LINE = 0.35

/** Deterministic headline vs random variants — clearer social comparison copy. */
function getSuccessHeadline(
  userScore: number,
  communityAvg: number | null,
  communityCount: number | null
): string {
  const hasCommunity = communityAvg != null && (communityCount ?? 0) > 0
  const count = communityCount ?? 0

  if (!hasCommunity) {
    return "You're the first to rate this performance!"
  }

  const avg = communityAvg!
  const generosityVsAvg = userScore - avg // positive = user's numeric score is above community average

  if (Math.abs(generosityVsAvg) <= THRESHOLD_IN_LINE) {
    return "You're close to the community average"
  }

  const pct = Math.min(
    92,
    Math.max(55, Math.round(58 + Math.abs(generosityVsAvg) * 24 + Math.min(count / 50, 8)))
  )

  if (generosityVsAvg > THRESHOLD_IN_LINE) {
    return `You rated higher than ${pct}% of users`
  }
  return `You rated lower than ${pct}% of users`
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
  hideScore = false,
  hideLabel = false,
}: {
  label: string
  value: number
  onValueChange: (value: number) => void
  onSliderStart?: () => void
  onSliderEnd?: () => void
  disabled?: boolean
  touched?: boolean
  spotlightActive?: boolean
  hideScore?: boolean
  hideLabel?: boolean
}) {
  const [isActive, setIsActive] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  const trackRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null) // Container with padding for touch area
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

  // Update local value when prop changes
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

  // Native iOS-style touch handlers - instant response, no delays
  // Works like Spotify, Apple Music, YouTube sliders
  // IMPORTANT: Don't lock immediately - wait to detect horizontal vs vertical gesture
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || !containerRef.current || !trackRef.current) return

    const touch = e.touches[0]
    const containerRect = containerRef.current.getBoundingClientRect()
    const trackRect = trackRef.current.getBoundingClientRect()
    
    // Check if touch is within track bounds (not container padding - that's for scrolling)
    const isWithinTrack = 
      touch.clientX >= trackRect.left &&
      touch.clientX <= trackRect.right &&
      touch.clientY >= trackRect.top &&
      touch.clientY <= trackRect.bottom

    // If touch is on the track itself, lock immediately
    if (isWithinTrack) {
      const newValue = calculateValueFromTouch(touch.clientX)
      
      touchStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        isLocked: true, // Lock immediately for track touches
        currentValue: newValue
      }

      updateSliderVisuals(newValue)
      setLocalValue(newValue)
      onValueChange(newValue)
      
      setIsActive(true)
      haptic.light()
      onSliderStart?.()
      
      e.preventDefault() // Prevent scroll when touching track
    } else {
      // Touch is in padding area - don't lock yet, wait to see direction
      touchStateRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        isLocked: false, // Not locked - will lock only if horizontal movement detected
        currentValue: localValue
      }
      // Don't prevent default - allow scrolling if vertical
    }
  }, [disabled, calculateValueFromTouch, updateSliderVisuals, onValueChange, onSliderStart, localValue])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchStateRef.current || disabled) return

    const touch = e.touches[0]
    
    // If we're locked (touch started on track or horizontal movement detected), follow finger
    if (touchStateRef.current.isLocked) {
      e.preventDefault() // Always prevent scroll when dragging slider
      
      const newValue = calculateValueFromTouch(touch.clientX)
      touchStateRef.current.currentValue = newValue
      
      // Direct DOM updates for smoothness
      updateSliderVisuals(newValue)
      
      // Update state for score calculation
      setLocalValue(newValue)
      onValueChange(newValue)
    } else {
      // Not locked yet - detect direction
      const dx = Math.abs(touch.clientX - touchStateRef.current.startX)
      const dy = Math.abs(touch.clientY - touchStateRef.current.startY)
      
      // Require more horizontal movement to lock (prevent accidental activation during scroll)
      if (dx > 10 && dx > dy * 1.5) {
        // Horizontal movement detected - lock and activate slider
        touchStateRef.current.isLocked = true
        e.preventDefault() // Now prevent scroll
        const newValue = calculateValueFromTouch(touch.clientX)
        touchStateRef.current.currentValue = newValue
        updateSliderVisuals(newValue)
        setLocalValue(newValue)
        onValueChange(newValue)
        setIsActive(true)
        haptic.light()
        onSliderStart?.()
      } else if (dy > 10 && dy > dx * 1.5) {
        // Clear vertical scroll intent - don't interfere with scrolling
        touchStateRef.current = null
        setIsActive(false)
        return // Don't prevent default - allow scrolling
      }
      // If movement is too small or ambiguous, don't do anything yet
    }
  }, [disabled, calculateValueFromTouch, updateSliderVisuals, onValueChange, onSliderStart])

  const handleTouchEnd = useCallback(() => {
    if (!touchStateRef.current) return

    // Commit final value
    const finalValue = touchStateRef.current.currentValue
    setLocalValue(finalValue)
    onValueChange(finalValue)
    haptic.medium() // Confirmation feedback (silently fails on iOS)

    touchStateRef.current = null
    setIsActive(false)
    onSliderEnd?.()
  }, [onValueChange, onSliderEnd])

  // Attach native event listeners to container (includes padding area) with { passive: false } for iOS
  useEffect(() => {
    if (!isTouchDevice || !containerRef.current) return

    const container = containerRef.current

    // Add event listeners with { passive: false } so preventDefault works on iOS
    // Attach to container so entire touchable area (including padding) works
    container.addEventListener('touchstart', handleTouchStart, { passive: false })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: false })
    container.addEventListener('touchcancel', handleTouchEnd, { passive: false })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
      container.removeEventListener('touchcancel', handleTouchEnd)
    }
  }, [isTouchDevice, handleTouchStart, handleTouchMove, handleTouchEnd])

  // Desktop input handler
  const handleInputChange = useCallback((newValue: number) => {
    setLocalValue(newValue)
    onValueChange(newValue)
  }, [onValueChange])

  return (
    <div 
      className="space-y-2 sm:space-y-4 relative"
      style={{
        contentVisibility: 'visible',
        contain: 'none',
      }}
    >
      {/* Label with Value */}
      {(!hideLabel || !hideScore) && (
      <div className="flex items-center justify-between mb-2 sm:mb-3">
        {!hideLabel ? (
          <h3
            className="text-sm sm:text-xl font-semibold text-white"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
          >
            {label}
          </h3>
        ) : (
          <span />
        )}
        {!hideScore && (
          <span className="text-sm sm:text-xl font-bold text-[#FFD700]">
            {Math.round(localValue / 10)} / 10
          </span>
        )}
      </div>
      )}

      {/* Slider Container */}
      {/* Increased vertical padding for easier mobile touch (invisible padding) */}
      {/* Entire container is touchable - works like native iOS sliders */}
      <div 
        ref={containerRef}
        className="relative" 
        style={{ 
          paddingTop: '12px', 
          paddingBottom: '12px',
          touchAction: 'pan-x', // Prevent vertical scroll, allow horizontal
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      >
        {/* Track Background - with padding to contain thumb at edges */}
        {/* Touch handlers attached via native listeners with { passive: false } for iOS */}
        {/* touch-action: pan-x prevents scroll capture, allows horizontal drag only */}
        <div
          ref={trackRef}
          className="relative h-3 bg-[#0a0a0a] rounded-full border border-white/5"
          style={{ 
            paddingLeft: '16px', 
            paddingRight: '16px',
            touchAction: 'pan-x', // Prevent scroll capture - only allow horizontal panning
            WebkitTouchCallout: 'none', // Prevent iOS callout menu
            WebkitUserSelect: 'none', // Prevent text selection
            userSelect: 'none',
          }}
        >
          {/* Fill - Gold gradient - Updated directly via ref during drag for smoothness */}
          {/* pointer-events-none prevents this decorative element from stealing touches */}
          <div
            ref={fillRef}
            className="absolute top-0 left-0 h-full rounded-full pointer-events-none"
            style={{
              width: localValue === 0 ? '0px' : `calc(16px + ${localValue}% * (100% - 32px) / 100%)`,
              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
              boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)',
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
          {/* Visual thumb: 36px, but track container has 20px padding above/below for 44px+ touch area */}
          <div
            ref={thumbRef}
            className="absolute top-1/2 rounded-full shadow-lg pointer-events-none"
            style={{
              left: `calc(16px + ${localValue}% * (100% - 32px) / 100%)`,
              transform: 'translate(-50%, -50%)',
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
      <div className="hidden sm:flex justify-between mt-2 text-[10px] sm:text-xs text-gray-500">
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
  submittedRating: externalSubmittedRating,
  communityAvg10,
  communityRatingCount,
  communityDimensions,
  seededAggregateScore = null,
  movieCast = [],
  onGuestMomentumSignup,
}: PerformanceRatingClientWrapperProps) {
  const router = useRouter()
  const user = useUser()
  const [reviewComment, setReviewComment] = useState(initialRating?.comment ?? "")
  const [reviewIsSpoiler, setReviewIsSpoiler] = useState(Boolean(initialRating?.isSpoiler))

  // Detect iOS Safari to disable animations for critical UI
  const isIOS = typeof window !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream

  // Success animation states
  const [submitPhase, setSubmitPhase] = useState<'idle' | 'loading' | 'success'>(
    externalSubmittedRating ? 'success' : 'idle'
  )
  const [finalScore, setFinalScore] = useState<number | null>(null)
  const [hasAnimatedOnce, setHasAnimatedOnce] = useState(false)
  const [isGeneratingImage, setIsGeneratingImage] = useState(false)
  const [progressData, setProgressData] = useState<{
    ratingCount: number
    progress: number
    ratingsNeeded: number
    currentBadge: string
    nextBadge: string
    nextBadgeName: string
    nextBadgeConfig: BadgeConfig | null
    level: string
    levelEmoji: string
    nextLevel: string | null
    currentLevelMin: number
    nextLevelAt: number
    progressPercent: number
  } | null>(null)
  const [userBadges, setUserBadges] = useState<any[]>([])
  const gradientIdRef = useRef(`progressGradient-${Math.random().toString(36).substr(2, 9)}`)
  const rainbowGradientIdRef = useRef(`rainbowGradient-${Math.random().toString(36).substr(2, 9)}`)
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false)
  const successHeadlineRef = useRef<string | null>(null)
  const [successOverlayFaded, setSuccessOverlayFaded] = useState(false)

  // Guest-specific success state: count (re-read from localStorage when entering success)
  const [guestRatingsCount, setGuestRatingsCount] = useState(0)
  const [showGuestComparison, setShowGuestComparison] = useState(false)
  const [showGuestProgressCard, setShowGuestProgressCard] = useState(false)
  const [showGuestCarouselSection, setShowGuestCarouselSection] = useState(false)
  const [earlySaveCtaPulse, setEarlySaveCtaPulse] = useState(false)
  const [earlySavePulseDone, setEarlySavePulseDone] = useState(false)

  // Re-read guest count from localStorage when entering success (parent has already incremented it)
  useEffect(() => {
    if (submitPhase === 'success' && !user) {
      setGuestRatingsCount(readGuestRatingsCount())
    }
    if (submitPhase !== 'success') {
      setShowGuestComparison(false)
      setShowGuestProgressCard(false)
      setShowGuestCarouselSection(false)
      setGuestNextPerfs([])
      setGuestNextPerfLoading(false)
      setEarlySavePulseDone(false)
      setEarlySaveCtaPulse(false)
    }
  }, [submitPhase, user])

  useEffect(() => {
    if (submitPhase !== 'success' || user) return
    const cmp = setTimeout(() => setShowGuestComparison(true), 480)
    const carousel = setTimeout(() => setShowGuestCarouselSection(true), 900)
    const prg = setTimeout(() => setShowGuestProgressCard(true), 1280)
    return () => {
      clearTimeout(cmp)
      clearTimeout(carousel)
      clearTimeout(prg)
    }
  }, [submitPhase, user])

  // One subtle pulse on the early-save CTA (~1s after progress card appears), once per success session
  useEffect(() => {
    if (
      submitPhase !== 'success' ||
      user ||
      !showGuestProgressCard ||
      guestRatingsCount < 2 ||
      !onGuestMomentumSignup ||
      earlySavePulseDone
    ) {
      return
    }
    let pulseOff: ReturnType<typeof setTimeout> | undefined
    const t = setTimeout(() => {
      setEarlySaveCtaPulse(true)
      setEarlySavePulseDone(true)
      pulseOff = setTimeout(() => setEarlySaveCtaPulse(false), 700)
    }, 1000)
    return () => {
      clearTimeout(t)
      if (pulseOff) clearTimeout(pulseOff)
    }
  }, [submitPhase, user, showGuestProgressCard, guestRatingsCount, onGuestMomentumSignup, earlySavePulseDone])

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

  // Pick a random success headline once when we enter success (ref so it stays stable, no flash)
  const successHeadline =
    submitPhase === 'success' && finalScore !== null
      ? (() => {
          if (successHeadlineRef.current === null) {
            successHeadlineRef.current = getSuccessHeadline(
              finalScore,
              communityAvg10 ?? null,
              communityRatingCount ?? null
            )
          }
          return successHeadlineRef.current
        })()
      : (() => {
          successHeadlineRef.current = null
          return null
        })()

  /** Percentile line only when sample size and gap are strong enough; otherwise average only. */
  const guestCommunityComparison = useMemo(() => {
    if (user || submitPhase !== 'success' || finalScore === null) return null
    const avg = communityAvg10
    const count = communityRatingCount ?? 0
    if (avg == null || count <= 0) return null
    const avgRounded = Number(avg.toFixed(1))
    const MIN_COUNT_FOR_PERCENTILE = 12
    const MIN_GAP_FOR_PERCENTILE = 0.22
    const diff = finalScore - avg
    if (
      count >= MIN_COUNT_FOR_PERCENTILE &&
      diff >= MIN_GAP_FOR_PERCENTILE
    ) {
      const pct = Math.min(
        92,
        Math.max(55, Math.round(58 + diff * 24 + Math.min(count / 50, 8)))
      )
      return { kind: 'higher' as const, pct, avgRounded }
    }
    return { kind: 'average' as const, avgRounded }
  }, [user, submitPhase, finalScore, communityAvg10, communityRatingCount])

  // Success page: scroll is handled by scroll-to-carousel when overlay fades (no scroll to top)

  // Reset overlay state when entering success so the checkmark overlay shows
  useEffect(() => {
    if (submitPhase === 'success') setSuccessOverlayFaded(false)
  }, [submitPhase])

  // After checkmark has been visible, fade out the success overlay.
  // Guests need the overlay to release sooner: it sits at z-[100] with pointer-events:auto
  // and would otherwise swallow every click (e.g. "Save your ratings") until dismiss.
  useEffect(() => {
    if (submitPhase !== 'success' || successOverlayFaded) return
    const delayMs = user ? 1150 : 700
    const t = setTimeout(() => setSuccessOverlayFaded(true), delayMs)
    return () => clearTimeout(t)
  }, [submitPhase, successOverlayFaded, user])

  // When overlay fades, scroll to top so the success state starts at the top of the viewport
  useEffect(() => {
    if (submitPhase !== 'success' || !successOverlayFaded) return
    if (typeof window !== 'undefined') {
      const t = setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }, 100)
      return () => clearTimeout(t)
    }
  }, [submitPhase, successOverlayFaded])

  // Force Safari to render all sliders and button immediately (prevent lazy loading)
  useEffect(() => {
    // Force layout calculation for all sliders and button to prevent Safari lazy loading
    if (typeof window !== 'undefined' && submitPhase !== 'success') {
      // Use requestAnimationFrame to ensure DOM is ready
      const timeoutId = setTimeout(() => {
        requestAnimationFrame(() => {
          // Force layout recalculation by accessing offsetHeight
          const sliders = document.querySelectorAll('[data-slider-card]')
          const button = document.querySelector('[data-submit-button]')
          
          sliders.forEach((slider) => {
            // Force layout calculation
            ;(slider as HTMLElement).offsetHeight
          })
          
          if (button) {
            // Force layout calculation for button
            ;(button as HTMLElement).offsetHeight
          }
        })
      }, 100) // Small delay to ensure DOM is fully rendered
      
      return () => clearTimeout(timeoutId)
    }
  }, [submitPhase])

  const [emotionalRangeDepth, setEmotionalRangeDepth] = useState(initialRating?.emotionalDepth ?? 0)
  const [characterBelievability, setCharacterBelievability] = useState(initialRating?.believability ?? 0)
  const [technicalSkill, setTechnicalSkill] = useState(initialRating?.technicalSkill ?? 0)
  const [screenPresence, setScreenPresence] = useState(initialRating?.screenPresence ?? 0)
  const [chemistryInteraction, setChemistryInteraction] = useState(initialRating?.chemistry ?? 0)

  // Simple (one slider) vs in-depth (five sliders) mode - default to simple
  const [showInDepthSliders, setShowInDepthSliders] = useState(false)
  const initialOverall = useMemo(() => {
    if (initialRating?.emotionalDepth == null) return 0
    const avg = ( (initialRating.emotionalDepth ?? 0) + (initialRating.believability ?? 0) + (initialRating.technicalSkill ?? 0) + (initialRating.screenPresence ?? 0) + (initialRating.chemistry ?? 0) ) / 5
    return Math.round(avg)
  }, [initialRating?.emotionalDepth, initialRating?.believability, initialRating?.technicalSkill, initialRating?.screenPresence, initialRating?.chemistry])
  const [overallScore, setOverallScore] = useState(initialOverall)
  const [singleSliderTouched, setSingleSliderTouched] = useState(initialOverall > 0)

  // Track which sliders have been touched
  const [touchedSliders, setTouchedSliders] = useState({
    emotionalRangeDepth: initialRating?.emotionalDepth !== undefined,
    characterBelievability: initialRating?.believability !== undefined,
    technicalSkill: initialRating?.technicalSkill !== undefined,
    screenPresence: initialRating?.screenPresence !== undefined,
    chemistryInteraction: initialRating?.chemistry !== undefined,
  })

  // When `initialRating` arrives after mount (e.g. edit flow on slug-based rate page where
  // /api/ratings/me is fetched async), sync all slider states and show in-depth sliders so the form is prefilled.
  const hasAppliedInitialRating = useRef(false)
  useEffect(() => {
    if (!initialRating || hasAppliedInitialRating.current) return
    hasAppliedInitialRating.current = true
    const { emotionalDepth = 0, believability = 0, technicalSkill: ts = 0, screenPresence: sp = 0, chemistry = 0 } = initialRating
    setEmotionalRangeDepth(emotionalDepth)
    setCharacterBelievability(believability)
    setTechnicalSkill(ts)
    setScreenPresence(sp)
    setChemistryInteraction(chemistry)
    const avg = Math.round((emotionalDepth + believability + ts + sp + chemistry) / 5)
    setOverallScore(avg)
    if (avg > 0) setSingleSliderTouched(true)
    setTouchedSliders({
      emotionalRangeDepth: emotionalDepth > 0,
      characterBelievability: believability > 0,
      technicalSkill: ts > 0,
      screenPresence: sp > 0,
      chemistryInteraction: chemistry > 0,
    })
    // When editing, show all 5 sliders prefilled (like dashboard pencil flow)
    if ([emotionalDepth, believability, ts, sp, chemistry].some((v) => (v ?? 0) > 0)) {
      setShowInDepthSliders(true)
    }
  }, [initialRating])

  // Spotlight animation state
  const [spotlightPhase, setSpotlightPhase] = useState<'none' | 'score' | 'button'>('none')
  const lastInteractionTime = useRef<number>(Date.now())
  const spotlightTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const scoreRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const previousScoreRef = useRef(0)
  const isDraggingRef = useRef<boolean>(false)
  const [sliderReleaseTime, setSliderReleaseTime] = useState<number>(0)
  const [nextPerfs, setNextPerfs] = useState<SuccessCarouselPerf[]>([])
  const [guestNextPerfs, setGuestNextPerfs] = useState<SuccessCarouselPerf[]>([])
  const [guestNextPerfLoading, setGuestNextPerfLoading] = useState(false)
  const [nextPerfLoading, setNextPerfLoading] = useState(false)
  const [actorProgress, setActorProgress] = useState<{ totalPerformances: number; userRatedCount: number } | null>(null)
  const carouselSectionRef = useRef<HTMLDivElement>(null)

  // Sticky score pill state
  const [isSticky, setIsSticky] = useState(false)
  const [submitFeedback, setSubmitFeedback] = useState<string | null>(null)

  // Calculate average of 5 sliders (or single overall when simple mode), convert to 0-10 scale
  const totalScoreOutOf10 = useMemo(() => {
    if (!showInDepthSliders) {
      const v = Number(overallScore) || 0
      const totalScore = Math.max(0, Math.min(100, v)) / 10
      return Number(totalScore.toFixed(1))
    }
    const sliders = [
      Number(emotionalRangeDepth) || 0,
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
  }, [showInDepthSliders, overallScore, emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction])

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

  const canSubmit = showInDepthSliders ? allSlidersTouched : singleSliderTouched

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

    switch (key) {
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

  const handleExpandInDepth = useCallback(() => {
    setShowInDepthSliders(true)
    const score = Math.round(overallScore)
    setEmotionalRangeDepth(score)
    setCharacterBelievability(score)
    setTechnicalSkill(score)
    setScreenPresence(score)
    setChemistryInteraction(score)
    setTouchedSliders({
      emotionalRangeDepth: true,
      characterBelievability: true,
      technicalSkill: true,
      screenPresence: true,
      chemistryInteraction: true,
    })
  }, [overallScore])

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

  const fetchNextPerf = useCallback(async () => {
    const actorIdOrSlug = performance.actor.slug ?? performance.actor.id
    setNextPerfLoading(true)
    try {
      const res = await fetch(
        `/api/actors/${encodeURIComponent(actorIdOrSlug)}/next-unrated-performance?currentMovieId=${encodeURIComponent(performance.movie.id)}`,
        { cache: 'no-store' }
      )
      if (res.ok) {
        const data = await res.json()
        const rows = (data.performances ?? []) as Array<{
          movieSlug: string
          actorSlug: string
          movieTitle: string
          movieYear: number
          moviePosterUrl?: string | null
          actorImageUrl?: string | null
          actorName?: string
        }>
        setNextPerfs(
          rows.map((p) => ({
            ...p,
            actorName: p.actorName || performance.actor.name,
          }))
        )
        if (typeof data.totalPerformances === 'number' && typeof data.userRatedCount === 'number') {
          setActorProgress({ totalPerformances: data.totalPerformances, userRatedCount: data.userRatedCount })
        } else {
          setActorProgress(null)
        }
      } else {
        setNextPerfs([])
        setActorProgress(null)
      }
    } catch {
      setNextPerfs([])
      setActorProgress(null)
    } finally {
      setNextPerfLoading(false)
    }
  }, [performance.actor.id, performance.actor.slug, performance.actor.name, performance.movie.id])

  const fetchGuestNextPerf = useCallback(async () => {
    setGuestNextPerfLoading(true)
    try {
      const list = await fetchGuestSuccessRecommendations({
        currentActorId: performance.actor.id,
        currentActorSlug: performance.actor.slug,
        currentActorName: performance.actor.name,
        currentActorImageUrl: performance.actor.imageUrl,
        currentMovieId: performance.movie.id,
      })
      setGuestNextPerfs(list)
    } catch {
      setGuestNextPerfs([])
    } finally {
      setGuestNextPerfLoading(false)
    }
  }, [
    performance.actor.id,
    performance.actor.slug,
    performance.actor.name,
    performance.actor.imageUrl,
    performance.movie.id,
  ])

  useEffect(() => {
    if (submitPhase === 'success' && !user) {
      fetchGuestNextPerf()
    }
  }, [submitPhase, user, fetchGuestNextPerf])

  // Fetch user progress data
  const fetchUserProgress = useCallback(async () => {
    if (!user) return
    
    try {
      const response = await fetch('/api/user/level-progress', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        const levelProgress = getLevelProgress(data.ratingCount)
        
        // Get user badges
        const badges = getUserBadges(
          data.ratingCount,
          false, // isFoundingMember
          data.isFirstRater || false
        )
        setUserBadges(badges)
        
        setProgressData({
          ratingCount: data.ratingCount,
          progress: levelProgress.progress,
          ratingsNeeded: data.ratingsNeeded,
          currentBadge: levelProgress.currentBadge?.name || 'Viewer',
          nextBadge: levelProgress.nextBadge ? `${levelProgress.nextBadge.name} (${levelProgress.nextBadge.minRatings} ratings)` : 'Max Level',
          nextBadgeName: levelProgress.nextBadge?.name || '',
          nextBadgeConfig: levelProgress.nextBadge ?? null,
          level: data.level,
          levelEmoji: data.levelEmoji,
          nextLevel: data.nextLevel,
          currentLevelMin: data.currentLevelMin,
          nextLevelAt: data.nextLevelAt,
          progressPercent: data.progressPercent
        })
      }
    } catch (error) {
      console.error('Failed to fetch progress data:', error)
    }
  }, [user])

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()

    if (!canSubmit) return

    const ratingData = showInDepthSliders
      ? {
          emotionalDepth: Math.round(emotionalRangeDepth),
          technicalSkill: Math.round(technicalSkill),
          believability: Math.round(characterBelievability),
          screenPresence: Math.round(screenPresence),
          chemistry: Math.round(chemistryInteraction),
          ...(user
            ? {
                comment: reviewComment.trim() || undefined,
                isSpoiler: Boolean(reviewComment.trim() && reviewIsSpoiler),
              }
            : {}),
        }
      : {
          emotionalDepth: Math.round(overallScore),
          technicalSkill: Math.round(overallScore),
          believability: Math.round(overallScore),
          screenPresence: Math.round(overallScore),
          chemistry: Math.round(overallScore),
          ...(user
            ? {
                comment: reviewComment.trim() || undefined,
                isSpoiler: Boolean(reviewComment.trim() && reviewIsSpoiler),
              }
            : {}),
        }

    const score = (ratingData.emotionalDepth + ratingData.believability + ratingData.technicalSkill + ratingData.screenPresence + ratingData.chemistry) / 5 / 10
    setFinalScore(Number(score.toFixed(1)))

    haptic.medium()

    if (typeof document !== 'undefined') {
      document.body.style.overflow = ''
      document.body.style.touchAction = ''
    }

    // Pre-fetch next performances so carousel is ready when success page shows
    if (user) fetchNextPerf()
    else fetchGuestNextPerf()

    setSubmitFeedback(null)
    setSubmitPhase('loading')

    try {
      await onSubmit(ratingData)
      setSubmitPhase('success')
      fetchUserProgress()

      trackRateSubmit(
        performance.actor.name,
        performance.movie.title,
        Number(score.toFixed(1))
      )
      trackFirstRatingComplete()
      if (onSuccess) onSuccess(ratingData)
    } catch (err: unknown) {
      // Rejection = unauthenticated (sign-up modal); reset so button is clickable again.
      // For real failures (e.g. guest API/reCAPTCHA errors), show visible feedback
      // so the click never feels like a no-op.
      setSubmitPhase('idle')
      const msg = err instanceof Error ? err.message : ''
      if (msg && msg !== 'USER_NOT_SIGNED_IN' && msg !== 'REDIRECT_SIGNIN') {
        setSubmitFeedback(msg)
      } else if (msg !== 'USER_NOT_SIGNED_IN' && msg !== 'REDIRECT_SIGNIN') {
        setSubmitFeedback('Could not save your rating. Please try again.')
      }
      if (typeof document !== 'undefined') {
        document.body.style.overflow = ''
        document.body.style.touchAction = ''
      }
    }
  }, [canSubmit, showInDepthSliders, overallScore, emotionalRangeDepth, characterBelievability, technicalSkill, screenPresence, chemistryInteraction, onSubmit, onSuccess, fetchUserProgress, user, performance.actor.name, performance.movie.title, reviewComment, reviewIsSpoiler])

  const buildGuestMomentumPayload = useCallback(() => {
    const ratingData = showInDepthSliders
      ? {
          emotionalDepth: Math.round(emotionalRangeDepth),
          technicalSkill: Math.round(technicalSkill),
          believability: Math.round(characterBelievability),
          screenPresence: Math.round(screenPresence),
          chemistry: Math.round(chemistryInteraction),
        }
      : {
          emotionalDepth: Math.round(overallScore),
          technicalSkill: Math.round(overallScore),
          believability: Math.round(overallScore),
          screenPresence: Math.round(overallScore),
          chemistry: Math.round(overallScore),
        }
    return {
      ...ratingData,
      actorId: performance.actor.id,
      movieId: performance.movie.id,
      actorName: performance.actor.name,
      movieTitle: performance.movie.title,
      movieYear: performance.movie.year,
      comment: performance.comment,
    }
  }, [
    showInDepthSliders,
    emotionalRangeDepth,
    technicalSkill,
    characterBelievability,
    screenPresence,
    chemistryInteraction,
    overallScore,
    performance.actor.id,
    performance.actor.name,
    performance.movie.id,
    performance.movie.title,
    performance.movie.year,
    performance.comment,
  ])

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

  // Load an image via our same-origin proxy so canvas drawing is never CORS-tainted
  const loadImage = (src: string): Promise<HTMLImageElement | null> =>
    new Promise((resolve) => {
      const proxied = `/api/proxy-image?url=${encodeURIComponent(src)}`
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = proxied
    })

  // Draw actor photo (or gold initial fallback) as a portrait rectangle with rounded corners
  const drawPortraitPhoto = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement | null,
    x: number,
    y: number,
    w: number,
    h: number,
    initial: string
  ) => {
    const radius = Math.min(w, h) * 0.16

    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x + radius, y)
    ctx.lineTo(x + w - radius, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius)
    ctx.lineTo(x + w, y + h - radius)
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h)
    ctx.lineTo(x + radius, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius)
    ctx.lineTo(x, y + radius)
    ctx.quadraticCurveTo(x, y, x + radius, y)
    ctx.closePath()
    ctx.clip()

    if (img && img.naturalWidth > 0 && img.naturalHeight > 0) {
      // Cover the rect fully (like CSS background-size: cover) so there are no empty side gaps
      const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight)
      const dw = img.naturalWidth * scale
      const dh = img.naturalHeight * scale
      const dx = x + (w - dw) / 2
      const dy = y + (h - dh) / 2
      ctx.drawImage(img, dx, dy, dw, dh)
    } else {
      const g = ctx.createLinearGradient(x, y, x + w, y + h)
      g.addColorStop(0, '#FFE55C')
      g.addColorStop(1, '#FFA500')
      ctx.fillStyle = g
      ctx.fillRect(x, y, w, h)
      ctx.fillStyle = '#000'
      const fontSize = Math.min(w, h) * 0.4
      ctx.font = `bold ${fontSize}px Georgia, serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText(initial, x + w / 2, y + h / 2)
    }
    ctx.restore()

    // Gold border, slightly inset so it hugs the image
    ctx.save()
    ctx.beginPath()
    const inset = 3
    const ix = x + inset
    const iy = y + inset
    const iw = w - inset * 2
    const ih = h - inset * 2
    const r2 = Math.max(radius - inset, 4)
    ctx.moveTo(ix + r2, iy)
    ctx.lineTo(ix + iw - r2, iy)
    ctx.quadraticCurveTo(ix + iw, iy, ix + iw, iy + r2)
    ctx.lineTo(ix + iw, iy + ih - r2)
    ctx.quadraticCurveTo(ix + iw, iy + ih, ix + iw - r2, iy + ih)
    ctx.lineTo(ix + r2, iy + ih)
    ctx.quadraticCurveTo(ix, iy + ih, ix, iy + ih - r2)
    ctx.lineTo(ix, iy + r2)
    ctx.quadraticCurveTo(ix, iy, ix + r2, iy)
    ctx.closePath()
    ctx.strokeStyle = 'rgba(255,215,0,0.5)'
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.restore()
  }

  // Render a 1080×1350 PNG using canvas — includes real actor/movie images
  const shareAsImage = async (forDownload = false) => {
    if (finalScore === null) return
    setIsGeneratingImage(true)
    try {
      const W = 1080, H = 1350
      const canvas = document.createElement('canvas')
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')!

      // ── 1. Black base ──────────────────────────────────────────────────
      ctx.fillStyle = '#000'
      ctx.fillRect(0, 0, W, H)

      // ── 2. Movie poster — blurred + darkened background ────────────────
      if (performance.movie.posterUrl) {
        const posterImg = await loadImage(performance.movie.posterUrl)
        if (posterImg) {
          ctx.save()
          // blur + darken via filter (Chrome/Firefox/Safari 16+)
          ctx.filter = 'blur(28px) brightness(0.22) saturate(0.55)'
          const scale = Math.max(W / posterImg.naturalWidth, H / posterImg.naturalHeight)
          const dw = posterImg.naturalWidth * scale * 1.12
          const dh = posterImg.naturalHeight * scale * 1.12
          ctx.drawImage(posterImg, (W - dw) / 2, (H - dh) / 2, dw, dh)
          ctx.restore()
          ctx.filter = 'none'
        }
      }

      // ── 3. Dark overlay ────────────────────────────────────────────────
      ctx.fillStyle = 'rgba(0,0,0,0.55)'
      ctx.fillRect(0, 0, W, H)

      // ── 4. Gold radial spotlight ───────────────────────────────────────
      const spot = ctx.createRadialGradient(W * 0.75, H * 0.28, 0, W * 0.75, H * 0.28, W * 0.75)
      spot.addColorStop(0, 'rgba(255,215,0,0.13)')
      spot.addColorStop(1, 'rgba(255,215,0,0)')
      ctx.fillStyle = spot
      ctx.fillRect(0, 0, W, H)

      // ── 5. Actor photo (portrait, with tight aspect) ───────────────────
      const actorPortraitW = 360
      const actorPortraitH = 540
      const actorPortraitX = (W - actorPortraitW) / 2
      const actorPortraitY = 170
      const actorSrc = performance.actor.imageUrl
        ? (upgradeActorImageRes(performance.actor.imageUrl) ?? performance.actor.imageUrl)
        : ''
      const actorImg = actorSrc ? await loadImage(actorSrc) : null
      drawPortraitPhoto(
        ctx,
        actorImg,
        actorPortraitX,
        actorPortraitY,
        actorPortraitW,
        actorPortraitH,
        performance.actor.name.charAt(0)
      )

      // ── 6. "MY RATING" eyebrow ─────────────────────────────────────────
      ctx.fillStyle = 'rgba(255,215,0,0.65)'
      ctx.font = '600 30px Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'alphabetic'
      ctx.fillText('MY RATING', W / 2, actorPortraitY + actorPortraitH + 60)

      // ── 7. Actor name ──────────────────────────────────────────────────
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 90px Georgia, "Times New Roman", serif'
      ctx.textAlign = 'center'
      // Shrink font if name is long
      const nameFontSize = performance.actor.name.length > 18 ? 68 : performance.actor.name.length > 14 ? 80 : 90
      ctx.font = `bold ${nameFontSize}px Georgia, "Times New Roman", serif`
      ctx.fillText(performance.actor.name, W / 2, actorPortraitY + actorPortraitH + 140)

      // ── 8. Movie title + year ──────────────────────────────────────────
      ctx.fillStyle = '#a1a1aa'
      ctx.font = '500 44px Arial, sans-serif'
      const movieLabel = `${performance.movie.title} · ${performance.movie.year}`
      const truncatedMovie = movieLabel.length > 34 ? performance.movie.title.substring(0, 28) + `... · ${performance.movie.year}` : movieLabel
      ctx.fillText(truncatedMovie, W / 2, actorPortraitY + actorPortraitH + 210)

      // ── 9. Gold divider ────────────────────────────────────────────────
      const makeDivider = (x: number, y: number, w: number) => {
        const g = ctx.createLinearGradient(x, y, x + w, y)
        g.addColorStop(0, 'rgba(255,215,0,0)')
        g.addColorStop(0.2, 'rgba(255,215,0,0.7)')
        g.addColorStop(0.5, 'rgba(255,215,0,1)')
        g.addColorStop(0.8, 'rgba(255,215,0,0.7)')
        g.addColorStop(1, 'rgba(255,215,0,0)')
        ctx.fillStyle = g
        ctx.fillRect(x, y, w, 2)
      }
      makeDivider(160, actorPortraitY + actorPortraitH + 248, W - 320)

      // ── 10. Big score ──────────────────────────────────────────────────
      const scoreGrad = ctx.createLinearGradient(W / 2 - 220, 0, W / 2 + 220, 0)
      scoreGrad.addColorStop(0, '#FFE55C')
      scoreGrad.addColorStop(0.4, '#FFD700')
      scoreGrad.addColorStop(0.85, '#FFA500')
      scoreGrad.addColorStop(1, '#FF8C00')

      ctx.fillStyle = scoreGrad
      ctx.font = `bold 230px Arial, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(`${finalScore}`, W / 2 - 55, actorPortraitY + actorPortraitH + 510)

      ctx.fillStyle = 'rgba(255,215,0,0.38)'
      ctx.font = 'bold 85px Arial, sans-serif'
      ctx.fillText('/10', W / 2 + 178, actorPortraitY + actorPortraitH + 498)

      // ── 11. Quality label ──────────────────────────────────────────────
      const quality = finalScore >= 9 ? 'MASTERPIECE' : finalScore >= 8 ? 'EXCELLENT' : finalScore >= 7 ? 'VERY GOOD' : finalScore >= 6 ? 'GOOD' : finalScore >= 4 ? 'AVERAGE' : 'BELOW AVERAGE'
      ctx.fillStyle = 'rgba(255,255,255,0.38)'
      ctx.font = '600 36px Arial, sans-serif'
      ctx.fillText(quality, W / 2, actorPortraitY + actorPortraitH + 580)

      // ── 12. Second divider ─────────────────────────────────────────────
      makeDivider(280, actorPortraitY + actorPortraitH + 625, W - 560)

      // ── 13. Branding ───────────────────────────────────────────────────
      ctx.fillStyle = 'rgba(255,215,0,0.38)'
      ctx.font = '500 32px Georgia, serif'
      ctx.fillText('actorrating.com', W / 2, H - 90)

      // ── Export ─────────────────────────────────────────────────────────
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png')
      })

      const filename = `${performance.actor.name.toLowerCase().replace(/\s+/g, '-')}-rating.png`
      const file = new File([blob], filename, { type: 'image/png' })

      if (!forDownload && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: `${performance.actor.name} · ${performance.movie.title}`, text: shareText })
        trackShareRating('native')
      } else {
        const objectUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = objectUrl
        a.download = filename
        a.click()
        URL.revokeObjectURL(objectUrl)
      }
    } catch {
      handleShare()
    } finally {
      setIsGeneratingImage(false)
    }
  }

  const doNavigateToActorPage = () => {
    sessionStorage.setItem('refreshActorRatings', performance.actor.id)
    if (performance.actor.slug) {
      sessionStorage.setItem('refreshActorRatingsSlug', performance.actor.slug)
    }
    const actorUrl = getActorUrl(performance.actor)
    router.push(`${actorUrl}#filmography`)
  }

  const handleBackToFilmography = () => {
    doNavigateToActorPage()
  }

  const handleRateNextPerformance = (p?: SuccessCarouselPerf) => {
    if (p) {
      router.push(`/rate/${p.movieSlug}/${p.actorSlug}`)
    } else if (nextPerfs.length > 0) {
      router.push(`/rate/${nextPerfs[0].movieSlug}/${nextPerfs[0].actorSlug}`)
    } else {
      doNavigateToActorPage()
    }
  }

  return (
    <div 
      className="min-h-screen bg-black relative overflow-x-hidden"
      style={{
        contentVisibility: 'visible',
        contain: 'none',
      }}
    >
      <motion.div
        className={`relative max-w-[900px] mx-auto px-3 sm:px-6 pb-8 sm:pb-20 md:pb-24 ${
          user
            ? showInDepthSliders
              ? 'pt-14 sm:pt-20 md:pt-24'
              : 'pt-24 sm:pt-20 md:pt-24'
            : showInDepthSliders
              ? 'pt-[4.5rem] sm:pt-24 md:pt-28'
              : 'pt-28 sm:pt-24 md:pt-28'
        }`}
        style={{
          contentVisibility: 'visible',
          contain: 'none',
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
      >

            {/* Header Section - Mobile optimized */}
        <div
          className="text-center mb-3 sm:mb-6 md:mb-8 px-1 sm:px-0"
          style={{
            opacity: 1,
            transform: 'none',
            display: submitPhase === 'success' ? 'none' : undefined,
          }}
        >
          {/* Actor Name - Primary Focus, Largest Text, White */}
          <h1
            id="actor-name-header"
            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-2 sm:mb-4 tracking-tight px-1 text-white leading-tight"
            style={{
              fontFamily: DISPLAY,
            }}
          >
            {performance.actor.name}
          </h1>
          {/* Movie Title - Clean, non-italic styling */}
          <div className="px-1">
            <h2
              className="text-2xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold mb-1 sm:mb-1.5 tracking-tight text-[#FFD700] leading-snug"
              style={{
                fontFamily: DISPLAY,
              }}
            >
              {performance.movie.title}
            </h2>
            <p
              className="text-lg sm:text-xl md:text-2xl text-zinc-400 font-medium"
              style={{
                fontFamily: 'var(--font-geist-sans), sans-serif',
              }}
            >
              {performance.movie.year}
            </p>
            <p
              className="text-base sm:text-base md:text-lg text-zinc-400 font-medium mt-3 sm:mt-4 px-2 max-w-xl mx-auto leading-snug"
              style={{
                fontFamily: 'var(--font-geist-sans), sans-serif',
              }}
            >
              How does your rating compare?
            </p>
          </div>

          {/* Actor + movie — same framed tiles as actor/movie pages */}
          <div className="flex justify-center items-end gap-4 sm:gap-6 mt-5 sm:mt-6">
            <ActorHeadshot
              name={performance.actor.name}
              imageUrl={upgradeActorImageRes(performance.actor.imageUrl)}
              size="lg"
              loading="eager"
            />
            <MoviePoster
              title={performance.movie.title}
              posterUrl={performance.movie.posterUrl}
              size="lg"
              loading="eager"
            />
          </div>

        </div>

        <form onSubmit={handleSubmit}>
          <div className="relative">
            {/* Sticky Score Display - Appears at top when main score pill reaches top of screen - No animations on iOS */}
            {isSticky && submitPhase !== 'success' && (
              <div
                className="fixed top-2 sm:top-4 left-1/2 z-[100] w-[180px] sm:w-[240px] md:w-[260px]"
                style={{
                  transform: 'translate(-50%, 0)',
                  opacity: 1,
                  visibility: 'visible',
                  pointerEvents: 'auto',
                }}
              >
                  <div
                    className="relative rounded-md px-3 sm:px-6 md:px-7 py-2 sm:py-5 md:py-6 transition-all duration-150 overflow-hidden border border-white/[0.08] bg-[#141414]"
                    style={{
                      width: '100%',
                    }}
                  >
                    <div className="relative text-center z-10">
                      <div
                        className="font-black mb-0.5 sm:mb-1 flex items-baseline justify-center gap-0.5 sm:gap-1.5 min-h-[2rem] sm:min-h-[3.5rem] md:min-h-[4rem]"
                        style={{
                          fontFamily: 'var(--font-geist-sans), sans-serif',
                          fontVariantNumeric: 'tabular-nums',
                        }}
                      >
                        <div className="relative inline-block overflow-visible min-w-[50px] sm:min-w-[80px] md:min-w-[90px] h-[2rem] sm:h-[3.5rem] md:h-[4rem] leading-[2rem] sm:leading-[3.5rem] md:leading-[4rem]">
                          <span
                            className="inline-block text-2xl sm:text-5xl md:text-6xl transition-all duration-75 ease-linear"
                            style={{
                              background: GOLD,
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
                          className="text-sm sm:text-xl md:text-2xl text-[#a1a1aa] leading-none"
                          style={{
                            verticalAlign: 'baseline',
                          }}
                        >
                          /10
                        </span>
                      </div>
                      <p className="text-[9px] sm:text-xs text-[#d4d4d8] font-semibold tracking-widest uppercase">Your score</p>
                    </div>
                  </div>
                  {submitFeedback && (
                    <div
                      className="mt-3 sm:mt-4 mx-auto max-w-[600px] rounded-xl px-4 py-3 text-sm text-center"
                      style={{
                        background: 'rgba(239,68,68,0.10)',
                        border: '1px solid rgba(239,68,68,0.35)',
                        color: '#fecaca',
                      }}
                    >
                      {submitFeedback}
                    </div>
                  )}
                </div>
              )}

            {/* Score Display - Responsive size, prevent cutoff, optimized for mobile - No animations on iOS */}
            {submitPhase !== 'success' && (
              <div
                ref={scoreRef}
                className="relative mx-auto -mb-3 sm:mb-8 z-50 w-[240px] sm:w-[280px] md:w-[300px]"
                style={{ 
                  marginTop: '0',
                  opacity: isSticky ? 0 : 1,
                  transform: 'none',
                  visibility: isSticky ? 'hidden' : 'visible',
                  pointerEvents: isSticky ? 'none' : 'auto',
                }}
              >
                  <div
                    className="relative rounded-md border border-white/[0.08] bg-[#141414] px-5 sm:px-8 md:px-10 py-4 sm:py-7 md:py-8 transition-all duration-700 overflow-hidden"
                    style={{
                      width: '100%',
                      minHeight: '100px',
                    }}
                  >
                    {/* Score pulse effect - subtle */}
                    <AnimatePresence>
                      {spotlightPhase === 'score' && (
                        <motion.div
                          initial={{
                            scale: 0.9,
                            opacity: 0,
                          }}
                          animate={{
                            scale: [0.9, 1.08, 1.0],
                            opacity: [0, 0.25, 0],
                          }}
                          exit={{
                            opacity: 0,
                          }}
                          transition={{
                            duration: 1.0,
                            times: [0, 0.5, 1],
                            ease: ['easeOut', 'easeIn'],
                          }}
                          className="absolute inset-0 pointer-events-none rounded-md"
                          style={{
                            background: 'radial-gradient(circle, rgba(255, 215, 0, 0.2) 0%, transparent 70%)',
                            zIndex: 0,
                          }}
                        />
                      )}
                    </AnimatePresence>
                    <div className="relative text-center z-10">
                      <div
                        className="font-black mb-1.5 sm:mb-2 flex items-baseline justify-center gap-1 sm:gap-1.5 min-h-[3rem] sm:min-h-[4.5rem] pt-1.5 sm:pt-2 pb-1.5 sm:pb-2"
                        style={{
                          fontFamily: 'var(--font-geist-sans), sans-serif',
                          fontVariantNumeric: 'tabular-nums',
                          position: 'relative',
                        }}
                      >
                        {/* Optimized score display - smooth updates on mobile */}
                        <div className="relative inline-block overflow-visible min-w-[60px] sm:min-w-[90px] h-[3rem] sm:h-[4.5rem] leading-[3rem] sm:leading-[4.5rem]">
                          <span
                            className="inline-block text-4xl sm:text-5xl md:text-6xl lg:text-7xl transition-all duration-75 ease-linear"
                            style={{
                              background: GOLD,
                              WebkitBackgroundClip: 'text',
                              WebkitTextFillColor: 'transparent',
                              backgroundClip: 'text',
                              lineHeight: '1',
                              verticalAlign: 'baseline',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {isAnimating ? animatedScore.toFixed(1) : totalScoreOutOf10.toFixed(1)}
                          </span>
                        </div>
                        <span
                          className="text-base sm:text-xl md:text-2xl lg:text-3xl text-[#a1a1aa] leading-none"
                          style={{
                            verticalAlign: 'baseline',
                          }}
                        >
                          /10
                        </span>
                      </div>
                      <p className="text-xs sm:text-sm text-[#d4d4d8] font-semibold tracking-widest uppercase">Your score</p>
                    </div>
                  </div>
                </div>
              )}

            {/* Rating Card - Discover surface language */}
            {submitPhase !== 'success' && (
              <div
                className="relative rounded-md border border-white/[0.08] bg-[#141414] p-4 sm:p-6 md:p-8 lg:p-12 py-4 sm:py-10 md:py-12 space-y-3 sm:space-y-6 md:space-y-8 lg:space-y-10 overflow-visible w-full max-w-full mx-auto"
                style={{
                  contentVisibility: 'visible',
                  contain: 'none',
                  opacity: 1, // Force visible on iOS
                  transform: 'none', // No transforms on iOS
                  marginTop: '-0.75rem', // Allow score pill to overlap slightly
                }}
              >
                  {/* Instructions — extra top space on mobile so sticky score doesn’t cover the prompt */}
                  <div
                    className={`text-center mb-3 sm:mb-6 max-w-[600px] mx-auto ${
                      isSticky ? 'pt-16 sm:pt-2' : 'pt-8 sm:pt-0'
                    }`}
                  >
                    {showInDepthSliders ? (
                      <p className="text-xs sm:text-base text-[#a3a3a3] font-light">
                        Each criterion is scored individually. Final score is the average of all five.
                      </p>
                    ) : (
                      <p
                        className="text-2xl sm:text-2xl md:text-2xl text-white font-semibold tracking-tight px-1 leading-snug"
                        style={{
                          fontFamily: DISPLAY,
                        }}
                      >
                        How good was this Performance?
                      </p>
                    )}
                  </div>

                  {/* Sliders - One by default, five when "Break it down" is expanded */}
                  <div
                    className="space-y-5 sm:space-y-8 relative z-10 w-full max-w-full sm:max-w-[600px] mx-auto"
                    style={{
                      touchAction: 'pan-y',
                      opacity: 1,
                      visibility: 'visible',
                      paddingBottom: '0px',
                      contentVisibility: 'visible',
                      contain: 'none',
                      transform: 'none',
                      display: 'block',
                    }}
                  >
                    {!showInDepthSliders ? (
                      <>
                        <div className="relative" data-slider-card>
                          <RatingSliderCard
                            label="What did you think?"
                            value={overallScore}
                            onValueChange={(v) => {
                              setOverallScore(v)
                              setSingleSliderTouched(true)
                            }}
                            onSliderStart={handleSliderStart}
                            onSliderEnd={handleSliderEnd}
                            disabled={submitting}
                            touched={singleSliderTouched}
                            spotlightActive={spotlightPhase !== 'none'}
                            hideScore
                            hideLabel
                          />
                        </div>
                        <p className="text-center text-xs sm:text-sm text-[#71717a] font-medium -mt-2 sm:-mt-1 px-1">
                          Slide to rate — takes 2 seconds
                        </p>
                        <div className="pt-3 sm:pt-5 flex justify-center w-full max-w-[600px] mx-auto">
                          <button
                            type="button"
                            onClick={handleExpandInDepth}
                            className="flex items-center justify-center gap-2.5 w-full px-5 py-3.5 sm:py-4 rounded-md border border-white/[0.1] bg-white/[0.03] text-zinc-300 hover:border-[#FFD700]/30 hover:text-white font-semibold text-sm sm:text-base transition-all"
                          >
                            <span>Break it down</span>
                            <span className="text-xs font-normal text-zinc-500">(optional)</span>
                            <ChevronDown className="w-5 h-5 shrink-0 opacity-90" aria-hidden />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="relative" data-slider-card>
                          <RatingSliderCard
                            label="Emotional Impact"
                            value={emotionalRangeDepth}
                            onValueChange={(v) => handleSliderChange('emotionalRangeDepth', v)}
                            onSliderStart={handleSliderStart}
                            onSliderEnd={handleSliderEnd}
                            disabled={submitting}
                            touched={touchedSliders.emotionalRangeDepth}
                            spotlightActive={spotlightPhase !== 'none'}
                          />
                        </div>

                        <div data-slider-card>
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
                        </div>

                        <div data-slider-card>
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
                        </div>

                        <div data-slider-card style={{ contentVisibility: 'visible', contain: 'none' }}>
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
                        </div>

                        <div data-slider-card style={{ contentVisibility: 'visible', contain: 'none' }}>
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

                        <div className="pt-3 sm:pt-5 flex justify-center w-full max-w-[600px] mx-auto">
                          <button
                            type="button"
                            onClick={() => {
                              const avg = Math.round((emotionalRangeDepth + characterBelievability + technicalSkill + screenPresence + chemistryInteraction) / 5)
                              setOverallScore(avg)
                              setShowInDepthSliders(false)
                            }}
                            className="flex items-center justify-center gap-2.5 w-full px-5 py-3.5 sm:py-4 rounded-md border border-white/[0.1] bg-white/[0.03] text-zinc-300 hover:border-[#FFD700]/30 hover:text-white font-semibold text-sm sm:text-base transition-all"
                          >
                            <ChevronUp className="w-5 h-5 shrink-0 opacity-90" aria-hidden />
                            <span>Back to simple</span>
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Optional micro-review — signed-in only */}
                  {user ? (
                    <div className="pt-4 sm:pt-5 max-w-[600px] mx-auto space-y-3">
                      <div>
                        <label
                          htmlFor="micro-review"
                          className="block text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-2"
                        >
                          Why this score? <span className="normal-case tracking-normal font-normal text-zinc-600">(optional)</span>
                        </label>
                        <textarea
                          id="micro-review"
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value.slice(0, COMMENT_MAX_LENGTH))}
                          rows={3}
                          maxLength={COMMENT_MAX_LENGTH}
                          placeholder="e.g. Gave high Technical Skill for the dialect work in Act II…"
                          className="w-full rounded-md border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 outline-none focus:border-[#FFD700]/40 resize-y min-h-[72px]"
                        />
                        <p className="mt-1 text-[11px] text-zinc-600 text-right">
                          {reviewComment.length}/{COMMENT_MAX_LENGTH}
                        </p>
                      </div>
                      <label className="flex items-center gap-2.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={reviewIsSpoiler}
                          onChange={(e) => setReviewIsSpoiler(e.target.checked)}
                          disabled={!reviewComment.trim()}
                          className="h-4 w-4 rounded border-[#2a2a2a] bg-[#0a0a0a] text-[#FFD700] focus:ring-[#FFD700]/40 disabled:opacity-40"
                        />
                        <span className="text-xs text-zinc-400">Contains spoilers</span>
                      </label>
                    </div>
                  ) : null}

                  {/* Submit Button with white light sweep - Mobile optimized, never blurred or darkened */}
                  <div
                    className="pt-2 sm:pt-6 relative max-w-[600px] mx-auto flex justify-center"
                    style={{
                      filter: 'blur(0px)',
                      opacity: 1,
                      visibility: 'visible',
                      zIndex: 60,
                      contentVisibility: 'visible', // Force Safari to render button immediately
                      contain: 'none', // Prevent containment that might defer rendering
                      minHeight: 'auto', // No reserved space
                    }}
                  >
                    <motion.button
                      ref={buttonRef}
                      type="submit"
                      data-submit-button
      disabled={!canSubmit || submitPhase === 'loading'}
      className="group text-sm sm:text-lg md:text-xl font-bold tracking-wider relative overflow-hidden mx-auto"
      style={{
        cursor: (!canSubmit || submitPhase === 'loading') ? 'not-allowed' : 'pointer',
                        width: submitPhase === 'loading' ? '56px' : '100%',
                        height: submitPhase === 'loading' ? '56px' : 'auto',
                        padding: submitPhase === 'loading' ? '0' : '0.875rem 0',
                        borderRadius: submitPhase === 'loading' ? '50%' : '0.375rem',
                        background: (canSubmit && !submitting) || submitPhase === 'loading'
                          ? GOLD
                          : '#1a1a1a',
                        color: (canSubmit && !submitting) || submitPhase === 'loading' ? '#000000' : '#525252',
                        boxShadow: 'none',
                        border: (canSubmit && !submitting) || submitPhase === 'loading' ? 'none' : '1px solid #333',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                      animate={{
                        width: submitPhase === 'loading' ? '56px' : '100%',
                        height: submitPhase === 'loading' ? '56px' : 'auto',
                        padding: submitPhase === 'loading' ? '0' : '1.25rem 0',
                        borderRadius: submitPhase === 'loading' ? '50%' : '0.375rem',
                      }}
                      transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
                      whileHover={canSubmit && !submitting && submitPhase === 'idle' ? {
                        scale: 1.02,
                      } : {}}
                      whileTap={canSubmit && !submitting && submitPhase === 'idle' ? {
                        scale: 0.98,
                      } : {}}
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
                      {/* White light sweep effect on hover (only when idle) */}
                      {canSubmit && !submitting && submitPhase === 'idle' && spotlightPhase !== 'button' && (
                        <span
                          className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none"
                          style={{
                            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.4), transparent)',
                          }}
                        />
                      )}
                      <AnimatePresence mode="wait">
                        {submitPhase === 'loading' && (
                          <motion.div
                            key="loading"
                            initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                            animate={{ opacity: 1, scale: 1, rotate: 0 }}
                            exit={{ opacity: 0, scale: 0.5 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="relative z-10 w-8 h-8 rounded-full"
                            style={{
                              border: '4px solid #000000',
                              borderTopColor: 'transparent',
                              animation: 'spin 0.8s linear infinite',
                            }}
                          />
                        )}
                        {submitPhase === 'idle' && (
                          <motion.span
                            key="idle"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="relative z-10 block"
                          >
                            {submitting ? 'Submitting...' : canSubmit ? 'Save rating' : (showInDepthSliders ? 'Finish rating' : 'Slide to rate →')}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                </div>
              )}
          </div>
        </form>

        {/* ─── CONTEXT / DISCOVERY SECTION (visible below rating form, hidden on success) ─── */}
        {submitPhase !== 'success' && (
          <div className="mt-10 sm:mt-14 max-w-[600px] mx-auto px-1 sm:px-0 space-y-8 pb-16">
            <PerformanceReviewsSection
              actorId={performance.actor.id}
              movieId={performance.movie.id}
            />

            {/* Performance description */}
            {performance.comment && (
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2" style={{ color: '#52525b' }}>Performance</p>
                <p className="text-sm sm:text-base leading-relaxed" style={{ color: '#a1a1aa' }}>{performance.comment}</p>
              </div>
            )}

            {/* Critic Aggregate (TMDB-seeded) vs Community Rating — always separate */}
            <div
              className="rounded-2xl p-5 sm:p-6"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-4" style={{ color: '#52525b' }}>
                Scores
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
                <div>
                  <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-1.5" style={{ color: '#71717a' }}>
                    Critic Aggregate
                  </p>
                  {typeof seededAggregateScore === 'number' && Number.isFinite(seededAggregateScore) ? (
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-3xl sm:text-4xl font-black tabular-nums text-white">
                        {Number(seededAggregateScore.toFixed(1))}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: '#52525b' }}>/10</span>
                    </div>
                  ) : (
                    <p className="text-sm sm:text-base font-medium" style={{ color: '#a1a1aa' }}>
                      Not yet rated
                    </p>
                  )}
                  <p className="text-[11px] mt-1.5 leading-snug" style={{ color: '#52525b' }}>
                    Based on the film&apos;s TMDB audience score — not ActorRating users
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold tracking-[0.18em] uppercase mb-1.5" style={{ color: '#71717a' }}>
                    Community Rating
                  </p>
                  {communityAvg10 != null && communityRatingCount != null && communityRatingCount > 0 ? (
                    <>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl sm:text-4xl font-black tabular-nums" style={{ color: '#FFD700' }}>
                          {communityAvg10}
                        </span>
                        <span className="text-sm font-semibold" style={{ color: '#52525b' }}>/10</span>
                      </div>
                      <p className="text-[11px] mt-1.5 leading-snug" style={{ color: '#52525b' }}>
                        Based on{' '}
                        <span className="text-white font-semibold tabular-nums">{communityRatingCount}</span>{' '}
                        {communityRatingCount === 1 ? 'ActorRating rating' : 'ActorRating ratings'}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm sm:text-base font-medium" style={{ color: '#a1a1aa' }}>
                      Not yet rated
                    </p>
                  )}
                </div>
              </div>

              {communityAvg10 != null &&
                communityRatingCount != null &&
                communityRatingCount > 0 &&
                communityDimensions && (
                  <div className="space-y-3 mt-6 pt-5" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#3f3f46' }}>
                      Community breakdown
                    </p>
                    <div className="grid gap-y-3" style={{ gridTemplateColumns: '130px 1fr 28px' }}>
                      {([
                        { key: 'emotionalRangeDepth', label: 'Emotional Impact' },
                        { key: 'characterBelievability', label: 'Character Depth' },
                        { key: 'technicalSkill', label: 'Technical Skill' },
                        { key: 'screenPresence', label: 'Screen Presence' },
                        { key: 'chemistryInteraction', label: 'Originality' },
                      ] as const).map(({ key, label }) => {
                        const val = communityDimensions[key]
                        if (val == null) return null
                        return (
                          <React.Fragment key={key}>
                            <span className="text-xs self-center pr-3" style={{ color: '#71717a' }}>{label}</span>
                            <div className="self-center h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${val * 10}%`,
                                  background: 'linear-gradient(90deg, #FFE55C 0%, #FFA500 100%)',
                                }}
                              />
                            </div>
                            <span className="text-xs tabular-nums font-semibold text-right self-center pl-2" style={{ color: '#a1a1aa' }}>{val}</span>
                          </React.Fragment>
                        )
                      })}
                    </div>
                  </div>
                )}
            </div>

            {/* Links to actor page and movie page */}
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={getActorUrl(performance.actor)}
                className="flex flex-row items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/5 active:scale-[0.98]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <ActorHeadshot
                  name={performance.actor.name}
                  imageUrl={performance.actor.imageUrl}
                  size="sm"
                  loading="lazy"
                />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: '#52525b' }}>Actor</span>
                  <span className="text-sm font-semibold text-white leading-tight line-clamp-2">{performance.actor.name}</span>
                  <span className="text-[11px] mt-0.5" style={{ color: '#FFD700', opacity: 0.7 }}>View profile →</span>
                </div>
              </Link>
              <Link
                href={getMovieUrl(performance.movie)}
                className="flex flex-row items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-white/5 active:scale-[0.98]"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <MoviePoster
                  title={performance.movie.title}
                  posterUrl={performance.movie.posterUrl}
                  size="sm"
                  loading="lazy"
                />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: '#52525b' }}>Movie</span>
                  <span className="text-sm font-semibold text-white leading-tight line-clamp-2">{performance.movie.title}</span>
                  <span className="text-[11px] mt-0.5" style={{ color: '#FFD700', opacity: 0.7 }}>View cast →</span>
                </div>
              </Link>
            </div>

            {/* Rate more by this actor */}
            <div>
              <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#52525b' }}>
                Rate more performances by {performance.actor.name}
              </p>
              <Link
                href={getActorUrl(performance.actor)}
                className="flex items-center justify-between rounded-xl px-4 py-4 transition-colors hover:bg-white/5 group"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                <div>
                  <p className="text-sm font-semibold text-white">All performances</p>
                  <p className="text-xs mt-0.5" style={{ color: '#71717a' }}>Browse and rate {performance.actor.name}&apos;s full filmography</p>
                </div>
                <ArrowRight className="w-4 h-4 shrink-0 group-hover:translate-x-0.5 transition-transform" style={{ color: '#FFD700', opacity: 0.6 }} />
              </Link>
            </div>

            {/* Other performances from this movie */}
            {movieCast.length > 0 && (
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#52525b' }}>
                  Rate other performances from this movie
                </p>
                <div className="space-y-2">
                  {movieCast.slice(0, 4).map((castMember) => {
                    const rateUrl = castMember.movieSlug && castMember.actorSlug
                      ? `/rate/${castMember.movieSlug}/${castMember.actorSlug}`
                      : null
                    if (!rateUrl) return null
                    return (
                      <Link
                        key={castMember.actorId}
                        href={rateUrl}
                        className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-white/5 group"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                      >
                        <div className="w-9 h-9 rounded-xl shrink-0 overflow-hidden flex items-center justify-center"
                          style={{ background: 'rgba(255,215,0,0.07)', border: '1.5px solid rgba(255,215,0,0.18)' }}>
                          {castMember.actorImageUrl ? (
                            <img
                              src={castMember.actorImageUrl}
                              alt={castMember.actorName}
                              className="w-full h-full object-cover"
                              style={{ objectPosition: 'top center' }}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <span className="text-xs font-bold" style={{ color: 'rgba(255,215,0,0.55)' }}>
                              {castMember.actorName.charAt(0)}
                            </span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-white flex-1 line-clamp-1">{castMember.actorName}</span>
                        <span className="text-[11px] shrink-0 group-hover:translate-x-0.5 transition-transform" style={{ color: '#FFD700', opacity: 0.6 }}>Rate →</span>
                      </Link>
                    )
                  })}
                  {movieCast.length > 4 && (
                    <Link
                      href={getMovieUrl(performance.movie)}
                      className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs font-semibold transition-colors hover:bg-white/5"
                      style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', color: '#71717a' }}
                    >
                      +{movieCast.length - 4} more in {performance.movie.title}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        {/* ─── SUCCESS PAGE (Momentum Mode) ─────────────────────────────────── */}
        {submitPhase === 'success' && finalScore !== null && (
          <>
            {/* Full-page dark overlay with success checkmark — fades out after animation */}
            <motion.div
              className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95"
              style={{ pointerEvents: successOverlayFaded ? 'none' : 'auto' }}
              initial={{ opacity: 1 }}
              animate={{ opacity: successOverlayFaded ? 0 : 1 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="flex flex-col items-center justify-center"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 18,
                  mass: 0.8,
                }}
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 260,
                    damping: 20,
                    delay: 0.05,
                  }}
                  className="rounded-full p-2"
                  style={{
                    boxShadow: '0 0 0 3px rgba(255,215,0,0.15)',
                  }}
                >
                  <CheckCircle
                    className="w-20 h-20 sm:w-24 sm:h-24 text-[#FFD700]"
                    strokeWidth={2}
                  />
                </motion.div>
                <motion.p
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, duration: 0.3 }}
                  className="mt-4 text-xs font-semibold uppercase tracking-widest text-[#FFD700]/70"
                >
                  Your rating is saved
                </motion.p>
              </motion.div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1], delay: 0.2 }}
              className="mt-4 sm:mt-6 space-y-4 sm:space-y-6 px-1 sm:px-0"
            >
            {/* ── Rating saved label + feedback ─────────────────────────────── */}
            <div className="text-center pt-2 space-y-2">
              <p
                className="text-xs font-semibold uppercase tracking-widest text-[#FFD700]/70"
              >
                Your rating is saved
              </p>
              {successHeadline && (
                <p
                  className="text-xl sm:text-2xl font-semibold leading-snug text-white"
                  style={{ fontFamily: DISPLAY }}
                >
                  &ldquo;{successHeadline}&rdquo;
                </p>
              )}
            </div>

            <PerformanceReviewsSection
              actorId={performance.actor.id}
              movieId={performance.movie.id}
              refreshKey={submitPhase === 'success' ? 'success' : 0}
            />

            {/* ── Guest vs community (near score psychology) ───────────────── */}
            {!user && finalScore !== null && (
              <AnimatePresence>
                {showGuestComparison && guestCommunityComparison && (
                  <motion.div
                    key="guest-vs-community"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: 'easeOut' }}
                    className="rounded-md bg-[#141414] border border-white/[0.08] px-4 py-3 text-center mx-auto max-w-sm"
                  >
                    <p className="text-[11px] font-bold tracking-widest uppercase mb-1" style={{ color: '#52525b' }}>
                      Your score · {finalScore}/10
                    </p>
                    {guestCommunityComparison.kind === 'higher' ? (
                      <p className="text-sm sm:text-base font-semibold text-white leading-snug">
                        You rated higher than{' '}
                        <span style={{ color: '#FFD700' }}>{guestCommunityComparison.pct}%</span>
                        {' '}of users on this performance
                      </p>
                    ) : (
                      <p className="text-sm sm:text-base font-semibold text-white leading-snug">
                        Community average:{' '}
                        <span style={{ color: '#FFD700' }}>{guestCommunityComparison.avgRounded}/10</span>
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}


            {/* ── Share your rating ─────────────────────────────────────────── */}
            {finalScore !== null && (
              <div className="space-y-3">
                <div className="text-center space-y-1 px-1">
                  <p
                    className="text-[10px] font-bold tracking-widest uppercase"
                    style={{ color: '#3f3f46' }}
                  >
                    Share your rating
                  </p>
                  <p className="text-xs sm:text-sm font-medium text-[#71717a]">
                    Show others what you think
                  </p>
                </div>

                {/* Visual share card — portrait layout matching the generated share image */}
                <div
                  className="relative overflow-hidden mx-auto"
                  style={{
                    borderRadius: '1rem',
                    border: '1px solid rgba(255,215,0,0.15)',
                    aspectRatio: '4 / 5',
                    background: '#0a0a0a',
                    width: '100%',
                    maxWidth: '320px',
                  }}
                >
                  {/* Movie poster — blurred, darkened background */}
                  {performance.movie.posterUrl ? (
                    <img
                      src={performance.movie.posterUrl}
                      alt=""
                      aria-hidden
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      style={{
                        filter: 'blur(18px) brightness(0.22) saturate(0.6)',
                        transform: 'scale(1.12)',
                      }}
                    />
                  ) : (
                    <div
                      className="absolute inset-0"
                      style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(255,215,0,0.08) 0%, transparent 65%)' }}
                    />
                  )}

                  {/* Dark vignette overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.7) 100%)' }}
                  />

                  {/* Gold spotlight accent */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 25%, rgba(255,215,0,0.1) 0%, transparent 65%)' }}
                  />

                  {/* Card content — vertical layout */}
                  <div className="relative z-10 flex flex-col h-full">

                    {/* Actor photo — centered, smaller, fully visible (no crop) */}
                    <div
                      className="flex items-center justify-center"
                      style={{ flex: '0 0 50%', padding: '14px 14px 0' }}
                    >
                      {performance.actor.imageUrl ? (
                        <img
                          src={upgradeActorImageRes(performance.actor.imageUrl!) ?? undefined}
                          alt={performance.actor.name}
                          className="rounded-xl"
                          style={{
                            maxHeight: 'calc(100% - 14px)',
                            maxWidth: '58%',
                            width: 'auto',
                            height: 'auto',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            border: '1px solid rgba(255,215,0,0.15)',
                          }}
                        />
                      ) : (
                        <div
                          className="flex items-center justify-center font-bold text-black text-4xl rounded-xl"
                          style={{
                            width: '60%',
                            aspectRatio: '2/3',
                            background: GOLD,
                          }}
                        >
                          {performance.actor.name.charAt(0)}
                        </div>
                      )}
                    </div>

                    {/* Text + score section */}
                    <div className="flex flex-col items-center justify-center flex-1 px-4 pb-3 text-center">
                      <p
                        className="text-[10px] font-bold tracking-[0.2em] uppercase mb-0.5"
                        style={{ color: '#FFD700', opacity: 0.75 }}
                      >
                        My rating
                      </p>
                      <h3
                        className="text-white font-bold leading-tight"
                        style={{
                          fontFamily: 'var(--font-heading), Georgia, serif',
                          fontSize: 'clamp(15px, 5vw, 22px)',
                        }}
                      >
                        {performance.actor.name}
                      </h3>
                      <p
                        className="mt-0.5"
                        style={{ color: '#a1a1aa', fontSize: 'clamp(10px, 3vw, 13px)' }}
                      >
                        {performance.movie.title}
                        <span style={{ color: '#52525b' }}> · </span>
                        {performance.movie.year}
                      </p>

                      {/* Score */}
                      <div className="flex items-baseline gap-1 mt-2">
                        <span
                          className="font-black tabular-nums leading-none"
                          style={{
                            fontSize: 'clamp(2rem, 10vw, 3rem)',
                            background: GOLD,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                          }}
                        >
                          {finalScore}
                        </span>
                        <span
                          className="font-semibold"
                          style={{ color: 'rgba(255,215,0,0.4)', fontSize: 'clamp(0.75rem, 2.5vw, 1.1rem)' }}
                        >
                          /10
                        </span>
                      </div>
                    </div>

                    {/* Branding — bottom right */}
                    <p
                      className="absolute bottom-2 right-3 text-[10px] font-semibold"
                      style={{ color: 'rgba(255,215,0,0.35)', letterSpacing: '0.05em' }}
                    >
                      actorrating.com
                    </p>
                  </div>
                </div>

                {/* Primary share button — below the card */}
                <div className="flex justify-center">
                  <button
                    type="button"
                    onClick={handleShare}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-md text-sm font-bold text-black transition-all duration-200 hover:scale-[1.02] active:scale-95"
                    style={{
                      background: GOLD,
                    }}
                  >
                    <Share2 className="w-4 h-4" />
                    Share your rating
                  </button>
                </div>

                {/* Share buttons — 2×2 grid, colorful round icons on mobile, pills with labels on desktop */}
                <div className="grid grid-cols-4 sm:grid-cols-2 gap-3 sm:gap-3 justify-items-center sm:justify-items-stretch">

                  {/* X / Twitter */}
                  <button
                    type="button"
                    onClick={() => {
                      window.open(
                        `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
                        '_blank'
                      )
                      trackShareRating('twitter')
                    }}
                    className="inline-flex items-center justify-center sm:justify-center gap-0 sm:gap-2 h-12 w-12 sm:w-auto sm:px-4 sm:py-3 rounded-full sm:rounded-2xl text-[11px] sm:text-xs font-semibold text-white transition-all duration-200 hover:opacity-90 active:scale-95"
                    style={{
                      background: '#000000',
                      border: '1px solid rgba(255,255,255,0.15)',
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span className="hidden sm:inline">Post on X</span>
                  </button>

                  {/* Instagram — native file share on mobile, download on desktop */}
                  <button
                    type="button"
                    onClick={() => shareAsImage(false)}
                    disabled={isGeneratingImage}
                    className="inline-flex items-center justify-center sm:justify-center gap-0 sm:gap-2 h-12 w-12 sm:w-auto sm:px-4 sm:py-3 rounded-full sm:rounded-2xl text-[11px] sm:text-xs font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50"
                    style={{
                      background: isGeneratingImage
                        ? 'rgba(255,255,255,0.03)'
                        : 'linear-gradient(135deg, #f58529 0%, #dd2a7b 40%, #8134af 70%, #515bd4 100%)',
                      border: 'none',
                      color: isGeneratingImage ? '#52525b' : '#e4e4e7',
                    }}
                  >
                    {isGeneratingImage ? (
                      <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    )}
                    <span className="hidden sm:inline">Instagram</span>
                  </button>

                  {/* WhatsApp */}
                  <button
                    type="button"
                    onClick={() => {
                      window.open(
                        `https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`,
                        '_blank'
                      )
                      trackShareRating('native')
                    }}
                    className="inline-flex items-center justify-center sm:justify-center gap-0 sm:gap-2 h-12 w-12 sm:w-auto sm:px-4 sm:py-3 rounded-full sm:rounded-2xl text-[11px] sm:text-xs font-semibold transition-all duration-200 active:scale-95"
                    style={{
                      background: '#25D366',
                      border: 'none',
                      color: '#020817',
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current shrink-0" style={{ color: '#ffffff' }}>
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                    <span className="hidden sm:inline">WhatsApp</span>
                  </button>

                  {/* Download image */}
                  <button
                    type="button"
                    onClick={() => shareAsImage(true)}
                    disabled={isGeneratingImage}
                    className="inline-flex items-center justify-center sm:justify-center gap-0 sm:gap-2 h-12 w-12 sm:w-auto sm:px-4 sm:py-3 rounded-full sm:rounded-2xl text-[11px] sm:text-xs font-semibold transition-all duration-200 active:scale-95 disabled:opacity-50"
                    style={{
                      background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                      border: 'none',
                      color: '#000000',
                    }}
                  >
                    {isGeneratingImage ? (
                      <svg className="w-4 h-4 animate-spin shrink-0" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="12" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="w-4 h-4 fill-none stroke-current shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                      </svg>
                    )}
                    <span className="hidden sm:inline">Download</span>
                  </button>

                </div>
              </div>
            )}

            {/* ── Guest: rate another performance carousel ───────────────────── */}
            {!user && (
              <AnimatePresence>
                {showGuestCarouselSection && (
                  <motion.div
                    key="guest-rate-another"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45, ease: [0.22, 0.61, 0.36, 1] }}
                    className="space-y-3"
                  >
                    <SuccessRateAnotherCarousel
                      variant="guest"
                      perfs={guestNextPerfs}
                      loading={guestNextPerfLoading}
                      headlineActorName={performance.actor.name}
                      headlineActorImageUrl={performance.actor.imageUrl}
                      onRate={handleRateNextPerformance}
                      emptyMessage="Explore more performances from search or the homepage."
                      headerAbove={
                        guestRatingsCount >= 2 ? (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.05, duration: 0.35 }}
                            className="text-xs sm:text-sm font-medium tracking-wide"
                            style={{ color: 'rgba(255, 215, 0, 0.55)' }}
                          >
                            Your taste profile is starting to form.
                          </motion.p>
                        ) : undefined
                      }
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* ── Guest momentum progress (below carousel) ───────────────────── */}
            {!user && (
              <AnimatePresence>
                {showGuestProgressCard && (
                  <motion.div
                    key="guest-progress"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                    className="rounded-md bg-[#141414] border border-[#FFD700]/25 p-4 sm:p-5 space-y-3"
                  >
                    <p
                      className="text-center text-xl sm:text-2xl font-black tabular-nums flex justify-center gap-3 sm:gap-4"
                      style={{ color: '#FFD700' }}
                      aria-hidden
                    >
                      {Array.from({ length: GUEST_RATING_LIMIT }).map((_, i) => (
                        <span key={i}>{i < guestRatingsCount ? '●' : '○'}</span>
                      ))}
                    </p>
                    <p className="text-center text-sm sm:text-[15px] font-bold text-white leading-snug px-1">
                      {guestRatingsCount === 1 && <>You&apos;ve rated 1 performance</>}
                      {guestRatingsCount === 2 && (
                        <>You&apos;ve rated 2 performances — 1 more to unlock your profile</>
                      )}
                      {guestRatingsCount >= 3 && (
                        <>You&apos;ve rated 3 performances — unlock your profile to save them</>
                      )}
                      {guestRatingsCount === 0 && <>Keep rating — your progress builds here</>}
                    </p>
                    {guestRatingsCount === 2 && (
                      <p className="text-center text-xs font-medium" style={{ color: '#a1a1aa' }}>
                        Create your profile to keep your ratings
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            )}

            {/* ── Actor completion: X / Y performances rated (prominent) ─────────── */}
            {user && actorProgress != null && (
              <div
                className="rounded-md bg-[#141414] border border-white/[0.08] px-4 py-4 sm:px-6 sm:py-5 text-center"
              >
                <p className="text-xs sm:text-sm font-bold text-white mb-0.5 sm:mb-1">
                  {performance.actor.name} progress
                </p>
                <p className="text-xl sm:text-3xl font-black tabular-nums text-[#FFD700]">
                  {actorProgress.userRatedCount} / {actorProgress.totalPerformances} performances rated
                </p>
                {actorProgress.totalPerformances > 0 && (
                  <div className="mt-2 sm:mt-3 flex items-center justify-center gap-2 sm:gap-3">
                    <div className="flex-1 max-w-[160px] sm:max-w-[200px] h-1.5 sm:h-2 bg-white/10 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.round((actorProgress.userRatedCount / actorProgress.totalPerformances) * 100)}%`,
                        }}
                        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                        className="h-full rounded-full"
                        style={{
                          background: GOLD,
                        }}
                      />
                    </div>
                    <span className="text-sm font-bold text-[#a1a1aa] tabular-nums">
                      {Math.round((actorProgress.userRatedCount / actorProgress.totalPerformances) * 100)}%
                    </span>
                  </div>
                )}
              </div>
            )}

            {user && (
            <div ref={carouselSectionRef} className="space-y-4 sm:space-y-6">
              <SuccessRateAnotherCarousel
                variant="auth"
                perfs={nextPerfs}
                loading={nextPerfLoading}
                headlineActorName={performance.actor.name}
                headlineActorImageUrl={performance.actor.imageUrl}
                actorProgress={actorProgress}
                onRate={handleRateNextPerformance}
                onViewFilmography={handleBackToFilmography}
              />
              {!nextPerfLoading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.1 }}
                  className="mt-4 sm:mt-6"
                >
                  <p className="text-[10px] sm:text-xs font-bold tracking-widest uppercase text-[#a1a1aa] mb-2 sm:mb-3 text-center">
                    Discover another actor
                  </p>
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                    {[
                      {
                        name: 'Robert De Niro',
                        slug: 'robert-de-niro',
                        imageUrl: 'https://image.tmdb.org/t/p/w300/cT8htcckIuyI1Lqwt1CvD02ynTh.jpg',
                      },
                      {
                        name: 'Christian Bale',
                        slug: 'christian-bale',
                        imageUrl: 'https://image.tmdb.org/t/p/w300/qCpZn2e3dimwbryLnqxZuI88PTi.jpg',
                      },
                      {
                        name: 'Cillian Murphy',
                        slug: 'cillian-murphy',
                        imageUrl: 'https://image.tmdb.org/t/p/w300/lyUyVARQKhGxaxy0FbPJCQRpiaW.jpg',
                      },
                      {
                        name: 'Leonardo DiCaprio',
                        slug: 'leonardo-dicaprio',
                        imageUrl: 'https://image.tmdb.org/t/p/w300/wo2hJpn04vbtmh0B9utCFdsQhxM.jpg',
                      },
                    ].map((actor) => (
                      <button
                        key={actor.slug}
                        type="button"
                        onClick={() =>
                          router.push(getActorUrl({ id: actor.slug, name: actor.name, slug: actor.slug }))
                        }
                        className="inline-flex items-center gap-2 pl-1.5 pr-3 py-1.5 sm:pl-2 sm:pr-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium text-white border border-white/[0.08] bg-[#141414] hover:bg-white/10 hover:border-white/20 transition-colors"
                      >
                        <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full overflow-hidden flex items-center justify-center bg-[#111] border border-white/10">
                          {actor.imageUrl ? (
                            <img
                              src={actor.imageUrl}
                              alt={actor.name}
                              className="w-full h-full object-cover"
                              style={{ objectPosition: 'top center' }}
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <span className="text-[10px] font-semibold" style={{ color: '#FFD700' }}>
                              {actor.name.charAt(0)}
                            </span>
                          )}
                        </span>
                        <span className="max-w-[120px] sm:max-w-[160px] truncate">{actor.name}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
            )}
            {/* ── Progress bar + badges ────────────────────────────────────────── */}
            {user && progressData != null && (
              <div
                className="rounded-md bg-[#141414] border border-white/[0.08] px-4 py-3 sm:px-5 sm:py-4 space-y-2 sm:space-y-3"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    {userBadges.length > 0 ? (
                      userBadges.map((badge) => (
                        <div key={badge.id} className="flex items-center gap-1">
                          <Badge badge={badge} />
                        </div>
                      ))
                    ) : (
                      <span className="text-xs font-semibold text-[#a1a1aa] uppercase tracking-wider">Your progress</span>
                    )}
                  </div>
                  {progressData.ratingsNeeded > 0 && progressData.nextBadgeName ? (
                    <button
                      type="button"
                      onClick={() => setIsProgressModalOpen(true)}
                      className="flex items-center gap-1 text-xs text-[#71717a] hover:text-[#FFD700] transition-colors"
                    >
                      <Lock className="w-3 h-3" />
                      <span>{progressData.ratingsNeeded} to {progressData.nextBadgeName}</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  ) : null}
                </div>
                <div className="relative h-2.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressData.progress}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      background: GOLD,
                    }}
                  />
                </div>
                <p className="text-xs text-[#52525b] text-right tabular-nums">
                  {progressData.ratingCount} {progressData.ratingCount === 1 ? 'rating' : 'ratings'} · {Math.round(progressData.progress)}% to next level
                </p>
              </div>
            )}

            {/* ── Back to filmography ────────────────────────────────────────── */}
            <div className="pb-2 text-center">
              <button
                type="button"
                onClick={handleBackToFilmography}
                className="inline-flex items-center gap-1.5 text-sm font-medium transition-colors"
                style={{ color: '#3f3f46' }}
                onMouseEnter={(e) => (e.currentTarget.style.color = '#71717a')}
                onMouseLeave={(e) => (e.currentTarget.style.color = '#3f3f46')}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back to filmography
              </button>
            </div>

            {!user && showGuestProgressCard && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: 0.12 }}
                className="pb-6 pt-1 text-center"
              >
                <motion.button
                  type="button"
                  onClick={() => {
                    if (onGuestMomentumSignup) {
                      onGuestMomentumSignup(buildGuestMomentumPayload())
                    } else {
                      router.push('/auth/signin')
                    }
                  }}
                  animate={
                    earlySaveCtaPulse
                      ? {
                          scale: [1, 1.02, 1],
                        }
                      : {}
                  }
                  transition={{ duration: 0.68, ease: 'easeOut' }}
                  className="inline-flex items-center justify-center max-w-[min(100%,20rem)] px-4 py-2.5 rounded-md text-xs sm:text-sm font-medium transition-colors duration-300 outline-none focus-visible:ring-2 focus-visible:ring-[#FFD700]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-black border border-white/[0.1] bg-white/[0.02] text-[#71717a] hover:text-[#a1a1aa] hover:border-[#FFD700]/22 hover:bg-white/[0.04] active:scale-[0.99]"
                >
                  Create an account to save your ratings forever
                </motion.button>
              </motion.div>
            )}
            </motion.div>
          </>
        )}

        {/* Progress Modal */}
        {progressData && (
          <ProgressModal
            isOpen={isProgressModalOpen}
            onClose={() => setIsProgressModalOpen(false)}
            ratingCount={progressData.ratingCount}
          />
        )}

      </motion.div>
    </div>
  )
})
