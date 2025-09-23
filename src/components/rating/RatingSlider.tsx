"use client"

import { useState, useRef, useEffect, useCallback, memo } from "react"
import { cn } from "@/lib/utils"
import { RatingSliderProps } from "@/types/rating"
import { CRITERIA_DESCRIPTIONS } from "@/utils/ratingCalculator"
import { SmoothSlider } from "@/components/ui/SmoothSlider"

export const RatingSlider = memo(function RatingSlider({
  criterion,
  value,
  onChange,
  weight,
  label,
  description,
  icon,
  tooltip,
  disabled = false
}: RatingSliderProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)
  const tooltipRef = useRef<HTMLDivElement>(null)

  // Memoized the onChange handler to prevent unnecessary re-renders
  const handleValueChange = useCallback((newValue: number) => {
    if (!disabled) {
      onChange(newValue)
    }
  }, [onChange, disabled])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (disabled) return
    
    const step = e.shiftKey ? 10 : 1
    let newValue = value
    
    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault()
        newValue = Math.min(100, value + step)
        break
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault()
        newValue = Math.max(0, value - step)
        break
      case 'Home':
        e.preventDefault()
        newValue = 0
        break
      case 'End':
        e.preventDefault()
        newValue = 100
        break
      case 'PageUp':
        e.preventDefault()
        newValue = Math.min(100, value + 25)
        break
      case 'PageDown':
        e.preventDefault()
        newValue = Math.max(0, value - 25)
        break
    }
    
    if (newValue !== value) {
      onChange(newValue)
    }
  }, [value, onChange, disabled])

  // Get quality zone for visual feedback
  const getQualityZone = useCallback((score: number) => {
    if (score < 20) return { zone: 'Poor', color: 'bg-red-500', textColor: 'text-red-500' }
    if (score < 40) return { zone: 'Fair', color: 'bg-orange-500', textColor: 'text-orange-500' }
    if (score < 60) return { zone: 'Good', color: 'bg-yellow-500', textColor: 'text-yellow-500' }
    if (score < 80) return { zone: 'Very Good', color: 'bg-green-500', textColor: 'text-green-500' }
    if (score < 90) return { zone: 'Excellent', color: 'bg-blue-500', textColor: 'text-blue-500' }
    return { zone: 'Outstanding', color: 'bg-purple-500', textColor: 'text-purple-500' }
  }, [])

  const qualityZone = getQualityZone(value)

  // Auto-hide tooltip after delay
  useEffect(() => {
    if (showTooltip) {
      const timer = setTimeout(() => setShowTooltip(false), 3000)
      return () => clearTimeout(timer)
    }
  }, [showTooltip])

  return (
    <div
      className={cn(
        "group relative p-8 bg-muted rounded-2xl border transition-all duration-300",
        isHovered && !disabled ? "border-accent shadow-xl" : "border-border",
        disabled && "opacity-50 cursor-not-allowed"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header with icon, label, and weight */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 flex-1">
          <div className={cn(
            "flex items-center justify-center w-12 h-12 rounded-lg transition-colors",
            qualityZone.color.replace('bg-', 'bg-').replace('-500', '-500/20'),
            qualityZone.textColor
          )}>
            {icon}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg font-semibold text-foreground">{label}</h3>
              <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-1 rounded">
                {weight}%
              </span>
            </div>
            {/* Description is now only shown in tooltip */}
          </div>
        </div>
        
        {/* Tooltip trigger */}
        {tooltip && (
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setShowTooltip(!showTooltip)}
            aria-label="Show criteria details"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {/* Score display */}
      <div className="flex justify-between items-center mb-3">
        <span className="text-sm text-muted-foreground">0</span>
        <div className="text-center">
          <div className={cn(
            "text-2xl font-bold transition-colors",
            qualityZone.textColor
          )}>
            {value}
          </div>
          <div className="text-xs text-muted-foreground">
            {qualityZone.zone}
          </div>
        </div>
        <span className="text-sm text-muted-foreground">100</span>
      </div>

      {/* Smooth Slider */}
      <div className="relative mb-3">
        <SmoothSlider
          value={value}
          onValueChange={handleValueChange}
          min={0}
          max={100}
          step={1}
          disabled={disabled}
          showValue={false}
          showMinMax={false}
          size="lg"
          color="primary"
        />
        
        {/* Quality zones indicator */}
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>Poor</span>
          <span>Fair</span>
          <span>Good</span>
          <span>Very Good</span>
          <span>Excellent</span>
          <span>Outstanding</span>
        </div>
      </div>

      {/* Examples and tips */}
      <div className="pt-4">
        <div className="bg-secondary/50 rounded-lg p-3 border border-border/50">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="leading-relaxed">
              <span className="font-medium text-foreground">Examples:</span> {CRITERIA_DESCRIPTIONS[criterion]?.examples?.slice(0, 2).join(', ') || 'Examples not available'}
            </span>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && tooltip && (
        <div
          ref={tooltipRef}
          className="absolute z-50 top-full left-0 right-0 mt-2 p-4 bg-popover border border-border rounded-lg shadow-lg"
          role="tooltip"
        >
          <div className="text-sm text-popover-foreground">
            <h4 className="font-semibold mb-2">{label}</h4>
            <p className="mb-3">{tooltip}</p>
            <div className="text-xs text-muted-foreground">
              <strong>Examples:</strong> {CRITERIA_DESCRIPTIONS[criterion]?.examples?.join(', ') || 'Examples not available'}
            </div>
          </div>
        </div>
      )}

      {/* Focus indicator */}
      {isFocused && (
        <div className="absolute inset-0 rounded-xl border-2 border-primary/20 pointer-events-none" />
      )}

      {/* Hidden description for screen readers */}
      <div id={`${criterion}-description`} className="sr-only">
        {description}. Current rating: {value} out of 100. {qualityZone.zone} quality.
      </div>
    </div>
  )
}) 