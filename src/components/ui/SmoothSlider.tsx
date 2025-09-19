"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

interface SmoothSliderProps {
  label?: string
  min?: number
  max?: number
  initial?: number
  step?: number
  value?: number
  onValueChange?: (value: number) => void
  onValueCommit?: (value: number) => void
  disabled?: boolean
  className?: string
  showValue?: boolean
  showMinMax?: boolean
  size?: 'sm' | 'md' | 'lg'
  color?: 'primary' | 'secondary' | 'accent'
}

export const SmoothSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SmoothSliderProps
>(({
  label,
  min = 0,
  max = 100,
  initial = 50,
  step = 1,
  value: controlledValue,
  onValueChange,
  onValueCommit,
  disabled = false,
  className,
  showValue = true,
  showMinMax = true,
  size = 'md',
  color = 'primary'
}, ref) => {
  // Local state for uncontrolled mode
  const [localValue, setLocalValue] = React.useState(initial)
  
  // Use controlled value if provided, otherwise use local state
  const currentValue = controlledValue !== undefined ? controlledValue : localValue
  
  // Memoized value change handler
  const handleValueChange = React.useCallback((newValues: number[]) => {
    if (disabled || newValues.length === 0) return
    
    const newValue = newValues[0]
    
    // Update local state if uncontrolled
    if (controlledValue === undefined) {
      setLocalValue(newValue)
    }
    
    // Call external onChange if provided
    if (onValueChange) {
      onValueChange(newValue)
    }
  }, [controlledValue, onValueChange, disabled])

  const handleValueCommit = React.useCallback((newValues: number[]) => {
    if (disabled || newValues.length === 0) return
    const newValue = newValues[0]
    if (onValueCommit) {
      onValueCommit(newValue)
    }
  }, [onValueCommit, disabled])

  // Size configurations
  const sizeConfig = {
    sm: {
      track: "h-2",
      thumb: "h-4 w-4",
      label: "text-sm",
      value: "text-sm"
    },
    md: {
      track: "h-3",
      thumb: "h-5 w-5",
      label: "text-base",
      value: "text-base"
    },
    lg: {
      track: "h-4",
      thumb: "h-6 w-6",
      label: "text-lg",
      value: "text-lg"
    }
  }

  const config = sizeConfig[size]

  // Color configurations
  const colorConfig = {
    primary: {
      track: "bg-muted",
      range: "bg-primary",
      thumb: "border-primary bg-background"
    },
    secondary: {
      track: "bg-muted",
      range: "bg-secondary-foreground",
      thumb: "border-secondary-foreground bg-background"
    },
    accent: {
      track: "bg-muted",
      range: "bg-accent",
      thumb: "border-accent bg-background"
    }
  }

  const colors = colorConfig[color]

  return (
    <div className={cn("w-full space-y-2", className)}>
      {/* Label and Value Display */}
      <div className="flex items-center justify-between">
        {label && (
          <label className={cn("font-medium text-foreground", config.label)}>
            {label}
          </label>
        )}
        {showValue && (
          <span className={cn("font-semibold text-primary", config.value)}>
            {currentValue}
          </span>
        )}
      </div>

      {/* Min/Max Labels */}
      {showMinMax && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{min}</span>
          <span>{max}</span>
        </div>
      )}

      {/* Slider */}
      <SliderPrimitive.Root
        ref={ref}
        value={[currentValue]}
        onValueChange={handleValueChange}
        onValueCommit={handleValueCommit}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={cn(
          "relative flex w-full touch-none select-none items-center",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <SliderPrimitive.Track 
          className={cn(
            "relative w-full grow overflow-hidden rounded-full cursor-pointer",
            config.track,
            colors.track
          )}
        >
          <SliderPrimitive.Range 
            className={cn(
              "absolute h-full rounded-full transition-colors",
              colors.range
            )} 
          />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb 
          className={cn(
            "block rounded-full border-2 ring-offset-background transition-all duration-200 touch-action-none cursor-grab active:cursor-grabbing",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:pointer-events-none disabled:opacity-50",
            "hover:scale-110 active:scale-105",
            config.thumb,
            colors.thumb
          )} 
        />
      </SliderPrimitive.Root>
    </div>
  )
})

SmoothSlider.displayName = "SmoothSlider" 