# Mobile Slider Full Implementation

Complete implementation of the direction-locked touch handling slider for mobile devices.

## Files

### 1. `src/lib/haptics.ts` - Haptic Feedback Utility

```typescript
/**
 * Haptic feedback utility for mobile devices
 * Provides discrete, intentional haptics that feel premium and non-annoying
 */

export const haptic = {
  /**
   * Light haptic - subtle selection feedback
   * Use for: touch start, minor value changes
   */
  light() {
    if ('vibrate' in navigator) {
      navigator.vibrate(8)
    }
  },

  /**
   * Medium haptic - confirmation feedback
   * Use for: touch end, milestone values
   */
  medium() {
    if ('vibrate' in navigator) {
      navigator.vibrate(15)
    }
  },

  /**
   * Heavy haptic - strong feedback
   * Use for: important actions, major milestones
   */
  heavy() {
    if ('vibrate' in navigator) {
      navigator.vibrate(25)
    }
  },
}
```

### 2. `src/lib/lockScroll.ts` - Scroll Lock Utility

```typescript
/**
 * Scroll lock utility for mobile touch interactions
 * Locks page scroll during slider drag to prevent scroll takeover
 */

export function lockScroll() {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
  }
}

export function unlockScroll() {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
    document.body.style.touchAction = ''
  }
}
```

### 3. `RatingSliderCard` Component - Full Implementation

```typescript
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
  
  // Detect touch device
  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window
  
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
  const updateSliderVisuals = useCallback((newValue: number) => {
    if (!fillRef.current || !thumbRef.current) return
    
    const padding = 16
    const fillWidth = newValue === 0 ? '0px' : `calc(16px + ${newValue}% * (100% - 32px) / 100%)`
    const thumbLeft = `calc(16px + ${newValue}% * (100% - 32px) / 100%)`
    
    fillRef.current.style.width = fillWidth
    thumbRef.current.style.left = thumbLeft
    
    // Haptic feedback every 5 points (discrete, non-annoying)
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
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return
    
    const touch = e.touches[0]
    touchStateRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      isLocked: false,
      currentValue: localValue
    }
    
    setIsActive(true)
    haptic.light() // Selection feedback
    onSliderStart?.()
  }, [disabled, localValue, onSliderStart])
  
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!touchStateRef.current || disabled) return
    
    const touch = e.touches[0]
    const dx = Math.abs(touch.clientX - touchStateRef.current.startX)
    const dy = Math.abs(touch.clientY - touchStateRef.current.startY)
    
    // Direction lock: detect horizontal vs vertical intent
    // Only lock into slider drag if horizontal movement is dominant
    if (!touchStateRef.current.isLocked) {
      // Threshold: 8px movement to determine intent
      if (dx > 8 && dx > dy) {
        // Horizontal intent confirmed - lock into slider drag
        touchStateRef.current.isLocked = true
        e.preventDefault() // Only prevent default AFTER horizontal intent confirmed
      } else if (dy > 8) {
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
    }
  }, [disabled, calculateValueFromTouch, updateSliderVisuals])
  
  const onTouchEnd = useCallback(() => {
    if (!touchStateRef.current) return
    
    // Only commit value if we were locked into horizontal drag
    if (touchStateRef.current.isLocked) {
      const finalValue = touchStateRef.current.currentValue
      setLocalValue(finalValue)
      onValueChange(finalValue) // Commit final value
      haptic.medium() // Confirmation feedback
    }
    
    touchStateRef.current = null
    setIsActive(false)
    onSliderEnd?.()
  }, [onValueChange, onSliderEnd])
  
  // Desktop input handler
  const handleInputChange = useCallback((newValue: number) => {
    setLocalValue(newValue)
    onValueChange(newValue)
  }, [onValueChange])

  return (
    <div className="space-y-3 sm:space-y-4 relative">
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
      <div className="relative pt-3 pb-3">
        {/* Track Background - with padding to contain thumb at edges */}
        {/* Touch handlers attached to track container for mobile with direction lock */}
        <div
          ref={trackRef}
          onTouchStart={isTouchDevice ? onTouchStart : undefined}
          onTouchMove={isTouchDevice ? onTouchMove : undefined}
          onTouchEnd={isTouchDevice ? onTouchEnd : undefined}
          onTouchCancel={isTouchDevice ? onTouchEnd : undefined}
          className="relative h-3 bg-[#0a0a0a] rounded-full border border-white/5"
          style={{ paddingLeft: '16px', paddingRight: '16px' }}
        >
          {/* Fill - Gold gradient - Updated directly via ref during drag for smoothness */}
          <div
            ref={fillRef}
            className="absolute top-0 left-0 h-full rounded-full will-change-[width]"
            style={{ 
              width: localValue === 0 ? '0px' : `calc(16px + ${localValue}% * (100% - 32px) / 100%)`,
              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
              boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)',
              transform: 'translateZ(0)', // Force GPU acceleration
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
          <div
            ref={thumbRef}
            className="absolute top-1/2 rounded-full shadow-lg pointer-events-none will-change-[left]"
            style={{
              left: `calc(16px + ${localValue}% * (100% - 32px) / 100%)`,
              transform: 'translate(-50%, -50%) translateZ(0)', // Force GPU acceleration
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
```

## Key Features

### 1. Direction-Locked Touch Handling
- Tracks initial touch position (X, Y) on `touchStart`
- Compares horizontal (dx) vs vertical (dy) movement deltas
- Only locks into slider drag if `dx > 8px AND dx > dy`
- If vertical intent detected (`dy > 8px`), aborts slider and allows page scroll
- Only calls `preventDefault()` AFTER horizontal intent is confirmed

### 2. Smooth Performance
- **No React state updates during drag** - updates thumb/fill directly via refs
- **Direct DOM manipulation** - `updateSliderVisuals()` updates styles directly
- **Value commit only on touchend** - `onValueChange()` called only when drag completes
- **No requestAnimationFrame** - removes latency during touch manipulation

### 3. No Global Scroll Locking
- Removed all `lockScroll()` and `unlockScroll()` calls
- No global `touchAction: 'none'`
- Only prevents default behavior inside `touchMove` after horizontal lock

### 4. Haptic Feedback
- Light haptic on touch start
- Light haptic every 5 points during drag
- Medium haptic on milestones (50, 75, 90, 100)
- Medium haptic on touch end

### 5. Desktop Support
- Input element works normally on desktop
- Mouse events for visual feedback
- `pointer-events-none` on mobile, `pointer-events-auto` on desktop

## How It Works

1. **Touch Start**: Records initial position, sets active state, triggers light haptic
2. **Touch Move**: 
   - Calculates movement deltas (dx, dy)
   - If not locked: determines intent (horizontal vs vertical)
   - If horizontal intent: locks into drag, prevents default
   - If vertical intent: aborts slider, allows scroll
   - If locked: updates slider visuals directly via refs
3. **Touch End**: 
   - Commits final value if locked into horizontal drag
   - Triggers confirmation haptic
   - Resets state

## Benefits

- ✅ Page scroll works normally when swiping vertically
- ✅ Slider drag is smooth and instant on mobile
- ✅ No layout jank or delayed thumb movement
- ✅ Bottom sliders behave identically to top sliders
- ✅ Desktop behavior unchanged
- ✅ Native-feeling interactions on iOS and Android

