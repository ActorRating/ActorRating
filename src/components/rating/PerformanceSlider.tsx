"use client"

import { useState, useCallback, memo } from "react"
import { cn } from "@/lib/utils"
import { SmoothSlider } from "@/components/ui/SmoothSlider"
import { motion } from "framer-motion"
import { fadeInUp, getMotionProps } from "@/lib/animations"

interface PerformanceSliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  icon: React.ReactNode
  description: string
}

export const PerformanceSlider = memo(function PerformanceSlider({
  label,
  value,
  onChange,
  icon,
  description,
}: PerformanceSliderProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  // Memoize the onChange handler to prevent unnecessary re-renders
  const handleValueChange = useCallback((newValue: number) => {
    onChange(newValue)
  }, [onChange])

  return (
    <div
      className="group relative p-4 bg-muted/50 rounded-xl border border-border/50 hover:border-primary/50 transition-all duration-300 flex flex-col"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center justify-center w-10 h-10 bg-primary/20 rounded-lg text-primary">
          {icon}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-foreground">{label}</h3>
            {description && (
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowTooltip(!showTooltip)}
                aria-label="Show criteria details"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </button>
            )}
          </div>
          {/* Description is now only shown in tooltip */}
        </div>
        <div className="text-right min-w-[80px]">
          <div className="text-2xl font-bold text-primary">{value}</div>
          <div className="text-xs text-muted-foreground h-4 flex items-center justify-end">out of 100</div>
        </div>
      </div>

      <div className="space-y-3 mt-auto">
        <div className="relative">
          <SmoothSlider
            value={value}
            onValueChange={handleValueChange}
            min={0}
            max={100}
            step={1}
            showValue={false}
            showMinMax={true}
            size="md"
            color="primary"
          />
        </div>

        {/* Performance indicator */}
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Poor</span>
          <span>Average</span>
          <span>Good</span>
          <span>Excellent</span>
          <span>Outstanding</span>
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && description && (
        <div className="absolute top-16 left-4 right-4 z-10 p-3 bg-background border border-border rounded-lg shadow-lg">
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      )}

      {/* Hover effect */}
      {isHovered && (
        <div className="absolute inset-0 bg-primary/5 rounded-xl border border-primary/20 pointer-events-none" />
      )}
    </div>
  )
}) 