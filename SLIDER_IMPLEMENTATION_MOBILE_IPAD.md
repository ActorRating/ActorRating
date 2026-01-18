# Slider Implementation for Mobile and iPad - Rate Page

This document details the slider implementation used on the rate page, specifically optimized for mobile and iPad devices.

## Component Location

The main slider component is `RatingSliderCard` located in:
- `src/components/rating/PerformanceRatingClientWrapper.tsx` (lines 143-295)

## Key Mobile/iPad Optimizations

### 1. Touch Event Handling (iOS Safari Optimized)

**CRITICAL FIX**: On mobile devices, we let the browser handle touch events natively through `onInput` and `onChange`. We only use mouse events on desktop:

```tsx
// Detect touch device
const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window

// Mobile: Use onInput/onChange (native browser handling)
onInput={(e) => {
  // onInput fires immediately during drag for instant feedback
  // On mobile, this is the primary event - set active state here
  setIsActive(true)
  handleInputChange(Number((e.currentTarget as HTMLInputElement).value))
}}
onChange={(e) => {
  // onChange fires on drag end - use for cleanup
  handleInputChange(Number(e.target.value))
  setIsActive(false)
  setIsDragging(false)
  onSliderEnd?.()
}}

// Desktop-only: mouse events for visual feedback
{...(!isTouchDevice && {
  onMouseDown: () => {
    setIsActive(true)
    setIsDragging(true)
    onSliderStart?.()
  },
  onMouseUp: () => {
    setIsActive(false)
    setIsDragging(false)
    onSliderEnd?.()
  },
  onMouseLeave: () => {
    if (isActive) {
      setIsActive(false)
      setIsDragging(false)
      onSliderEnd?.()
    }
  },
})}
```

This prevents iOS Safari from losing the drag gesture context.

### 2. Large Touch Targets

The input element uses responsive height classes to ensure easy interaction on touch devices:

```tsx
className="absolute top-1/2 left-0 w-full h-16 sm:h-12 -translate-y-1/2 opacity-0 cursor-pointer z-10"
```

- **Mobile (< 640px)**: `h-16` (64px height) - Larger touch target for easier interaction
- **Tablet/iPad (≥ 640px)**: `h-12` (48px height) - Still comfortable but more compact

### 3. Native Touch Handling (iOS Safari Fix)

**CRITICAL FIX**: The slider does NOT use `touchAction: 'none'` because it breaks iOS Safari's native drag gesture. Instead, we let the browser handle touch events natively:

```tsx
style={{ 
  // Removed touchAction: 'none' - breaks iOS Safari native drag gesture
  WebkitTapHighlightColor: 'transparent',
  paddingLeft: '16px',
  paddingRight: '16px',
}}
```

The native range input already prevents scrolling during drag, so we don't need to interfere.

### 4. Responsive Typography

Label text scales appropriately for different screen sizes:

```tsx
<h3 className="text-lg sm:text-xl font-semibold text-white">
  {label}
</h3>
```

- **Mobile**: `text-lg` (18px)
- **Tablet/iPad and up**: `text-xl` (20px)

### 5. GPU Acceleration

The slider uses GPU acceleration for smooth performance on mobile devices:

```tsx
// Fill track
style={{ 
  transform: 'translateZ(0)', // Force GPU acceleration
}}

// Thumb
style={{
  transform: 'translate(-50%, -50%) translateZ(0)', // Force GPU acceleration
  willChange: '[left,width,height]',
}}
```

### 6. Smooth Updates with RequestAnimationFrame

Value changes use `requestAnimationFrame` for smooth, performant updates:

```tsx
const handleInputChange = useCallback((newValue: number) => {
  setLocalValue(newValue)
  // Use RAF for smoother updates
  requestAnimationFrame(() => {
    onValueChange(newValue)
  })
}, [onValueChange])
```

### 7. Instant Visual Feedback

The slider uses `onInput` event which fires immediately during drag for instant feedback:

```tsx
onInput={(e) => {
  // onInput fires immediately during drag for instant feedback
  handleInputChange(Number((e.target as HTMLInputElement).value))
}}
onChange={(e) => {
  // onChange as fallback
  handleInputChange(Number(e.target.value))
}}
```

### 8. Active State Visual Feedback

**CRITICAL FIX**: The thumb does NOT resize during drag (which breaks iOS drag gesture). Instead, we use visual emphasis through enhanced shadow:

```tsx
style={{
  width: '28px',  // Fixed size - no resizing during drag
  height: '28px', // Fixed size - no resizing during drag
  boxShadow: isActive
    ? '0 0 24px rgba(255, 215, 0, 0.7), 0 4px 10px rgba(0, 0, 0, 0.3)'  // Enhanced glow when active
    : '0 0 20px rgba(255, 215, 0, 0.5), 0 4px 10px rgba(0, 0, 0, 0.3)', // Normal glow
}}
```

Resizing the thumb during drag changes the hit-testing geometry and can cause Safari to invalidate the active pointer.

## Complete Slider Component Code

```tsx
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
  const [isDragging, setIsDragging] = useState(false)
  const [localValue, setLocalValue] = useState(value)
  
  // Detect touch device
  const isTouchDevice = typeof window !== 'undefined' && 'ontouchstart' in window
  
  // Update local value when prop changes (for demo)
  useEffect(() => {
    setLocalValue(value)
  }, [value])
  
  const handleInputChange = useCallback((newValue: number) => {
    setLocalValue(newValue)
    // Use RAF for smoother updates
    requestAnimationFrame(() => {
      onValueChange(newValue)
    })
  }, [onValueChange])

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
      <div className="relative pt-3 pb-3">
        {/* Track Background - with padding to contain thumb at edges */}
        <div className="relative h-3 bg-[#0a0a0a] rounded-full border border-white/5" style={{ paddingLeft: '16px', paddingRight: '16px' }}>
          {/* Fill - Gold gradient - No transitions for instant response */}
          <div
            className="absolute top-0 left-0 h-full rounded-full will-change-[width]"
            style={{ 
              width: localValue === 0 ? '0px' : `calc(16px + ${localValue}% * (100% - 32px) / 100%)`,
              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
              boxShadow: '0 0 20px rgba(255, 215, 0, 0.3)',
              transform: 'translateZ(0)', // Force GPU acceleration
            }}
          />
          
          {/* Hidden input for interaction - larger touch/click target for mobile */}
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={localValue}
            onInput={(e) => {
              // onInput fires immediately during drag for instant feedback
              // On mobile, this is the primary event - set active state here
              setIsActive(true)
              handleInputChange(Number((e.currentTarget as HTMLInputElement).value))
            }}
            onChange={(e) => {
              // onChange fires on drag end - use for cleanup
              handleInputChange(Number(e.target.value))
              setIsActive(false)
              setIsDragging(false)
              onSliderEnd?.()
            }}
            {...(!isTouchDevice && {
              // Desktop-only: mouse events for visual feedback
              onMouseDown: () => {
                setIsActive(true)
                setIsDragging(true)
                onSliderStart?.()
              },
              onMouseUp: () => {
                setIsActive(false)
                setIsDragging(false)
                onSliderEnd?.()
              },
              onMouseLeave: () => {
                if (isActive) {
                  setIsActive(false)
                  setIsDragging(false)
                  onSliderEnd?.()
                }
              },
            })}
            disabled={disabled}
            className="absolute top-1/2 left-0 w-full h-16 sm:h-12 -translate-y-1/2 opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
            style={{ 
              // Removed touchAction: 'none' - breaks iOS Safari native drag gesture
              WebkitTapHighlightColor: 'transparent',
              paddingLeft: '16px',
              paddingRight: '16px',
            }}
            aria-label={label}
          />
          
          {/* Visible Thumb - No transitions for instant response */}
          {/* Fixed: Don't resize during drag - use visual emphasis instead to avoid breaking iOS drag gesture */}
          <div
            className="absolute top-1/2 rounded-full shadow-lg pointer-events-none will-change-[left]"
            style={{
              left: `calc(16px + ${localValue}% * (100% - 32px) / 100%)`,
              transform: 'translate(-50%, -50%) translateZ(0)', // Force GPU acceleration
              background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 50%, #FFA500 100%)',
              width: '28px',
              height: '28px',
              boxShadow: isActive
                ? '0 0 24px rgba(255, 215, 0, 0.7), 0 4px 10px rgba(0, 0, 0, 0.3)'
                : '0 0 20px rgba(255, 215, 0, 0.5), 0 4px 10px rgba(0, 0, 0, 0.3)',
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
```

## Responsive Breakpoints

The implementation uses Tailwind CSS breakpoints:

- **Mobile**: Default (< 640px)
  - Touch target height: `h-16` (64px)
  - Label text: `text-lg` (18px)
  - Spacing: `space-y-3`

- **Tablet/iPad (sm)**: ≥ 640px
  - Touch target height: `h-12` (48px)
  - Label text: `text-xl` (20px)
  - Spacing: `space-y-4`

- **Desktop (md)**: ≥ 768px
- **Large Desktop (lg)**: ≥ 1024px

## Key Features for Mobile/iPad

1. **Large Touch Targets**: 64px on mobile, 48px on tablet for easy interaction
2. **Native Touch Handling**: Lets iOS Safari handle drag gestures natively (no `touchAction: 'none'`)
3. **Instant Feedback**: Uses `onInput` for immediate visual updates during drag
4. **Smooth Performance**: GPU acceleration and `requestAnimationFrame` for 60fps updates
5. **Visual Feedback**: Enhanced shadow glow when active (no size change to avoid breaking drag)
6. **Accessibility**: Proper ARIA labels and keyboard support
7. **No Tap Highlight**: `WebkitTapHighlightColor: 'transparent'` for cleaner UI
8. **Device-Specific Events**: Mouse events only on desktop, native touch handling on mobile

## Critical iOS Safari Fixes Applied

### Fix 1: Removed `touchAction: 'none'`
- **Problem**: Breaks iOS Safari's native drag gesture handling
- **Solution**: Let the browser handle touch events natively (range inputs already prevent scroll during drag)

### Fix 2: Fixed Thumb Size During Drag
- **Problem**: Resizing thumb (28px → 32px) changes hit-testing geometry and breaks drag
- **Solution**: Use fixed 28px size with enhanced shadow glow for visual feedback

### Fix 3: Simplified Touch Event Handling
- **Problem**: Mixing native drag + manual touch state management causes Safari to lose drag lock
- **Solution**: Mobile uses `onInput`/`onChange` only, desktop uses mouse events

## Usage in Rate Page

The slider is used in the rating form wrapper:

```tsx
<RatingSliderCard 
  label="Emotional Impact" 
  value={emotionalRangeDepth} 
  onValueChange={(v) => handleSliderChange('emotionalRangeDepth', v)}
  onSliderStart={handleSliderStart}
  onSliderEnd={handleSliderEnd}
  disabled={submitting}
  touched={touchedSliders.emotionalRangeDepth}
/>
```

## Container Styling

The sliders are contained in a responsive container:

```tsx
<div 
  className="space-y-6 sm:space-y-8 relative z-10 w-full max-w-[600px] sm:max-w-[600px] mx-auto pb-4"
>
  {/* Sliders */}
</div>
```

- Consistent max-width of 600px on all screen sizes
- Responsive vertical spacing: 24px on mobile, 32px on tablet+
- Centered with auto margins

