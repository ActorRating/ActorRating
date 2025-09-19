"use client"

import { useState, useCallback } from 'react'
import { SmoothSlider } from '@/components/ui/SmoothSlider'

interface SliderValues {
  emotionalRangeDepth: number
  characterBelievability: number
  technicalSkill: number
  screenPresence: number
  chemistryInteraction: number
}

export function SliderDemo() {
  // Single state object for all slider values
  const [sliderValues, setSliderValues] = useState<SliderValues>({
    emotionalRangeDepth: 50,
    characterBelievability: 50,
    technicalSkill: 50,
    screenPresence: 50,
    chemistryInteraction: 50,
  })

  // Unified handler for updating any slider value
  const handleSliderChange = useCallback((key: keyof SliderValues, value: number) => {
    setSliderValues(prev => ({ ...prev, [key]: value }))
  }, [])

  // Dynamic total score calculation (NOT stored in state)
  const totalScore = Math.round(
    sliderValues.emotionalRangeDepth * 0.25 +
    sliderValues.characterBelievability * 0.25 +
    sliderValues.technicalSkill * 0.20 +
    sliderValues.screenPresence * 0.15 +
    sliderValues.chemistryInteraction * 0.15
  )

  return (
    <div className="max-w-md mx-auto p-6 space-y-6">
      <h2 className="text-xl font-semibold text-center mb-6">Rating Sliders Demo</h2>
      
      {/* Individual Sliders */}
      <div className="space-y-4">
        <SliderRow
          label="Emotional Range & Depth"
          value={sliderValues.emotionalRangeDepth}
          onChange={(value) => handleSliderChange('emotionalRangeDepth', value)}
        />
        
        <SliderRow
          label="Character Believability"
          value={sliderValues.characterBelievability}
          onChange={(value) => handleSliderChange('characterBelievability', value)}
        />
        
        <SliderRow
          label="Technical Skill"
          value={sliderValues.technicalSkill}
          onChange={(value) => handleSliderChange('technicalSkill', value)}
        />
        
        <SliderRow
          label="Screen Presence"
          value={sliderValues.screenPresence}
          onChange={(value) => handleSliderChange('screenPresence', value)}
        />
        
        <SliderRow
          label="Chemistry & Interaction"
          value={sliderValues.chemistryInteraction}
          onChange={(value) => handleSliderChange('chemistryInteraction', value)}
        />
      </div>

      {/* Total Score Display */}
      <div className="mt-6 p-4 bg-muted rounded-lg border">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Total Score</span>
          <span className="text-2xl font-bold text-primary">{totalScore}</span>
        </div>
      </div>

      {/* Debug Info */}
      <div className="mt-4 p-3 bg-background border rounded text-xs">
        <div className="font-medium mb-2">Current Values:</div>
        <div className="space-y-1">
          {Object.entries(sliderValues).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-muted-foreground">{key}:</span>
              <span className="font-mono">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// Individual Slider Row Component
interface SliderRowProps {
  label: string
  value: number
  onChange: (value: number) => void
}

function SliderRow({ label, value, onChange }: SliderRowProps) {
  const [innerValue, setInnerValue] = useState(value)

  // Sync inner value when prop changes
  if (innerValue !== value) {
    setInnerValue(value)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">{label}</div>
        <div className="text-sm font-medium">{innerValue}</div>
      </div>
      
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>0</span>
        <span>100</span>
      </div>
      
      <SmoothSlider
        value={innerValue}
        onValueChange={(next) => {
          const clamped = Math.min(100, Math.max(0, next))
          setInnerValue(clamped)
          onChange(clamped)
        }}
        onValueCommit={(next) => {
          const clamped = Math.min(100, Math.max(0, next))
          setInnerValue(clamped)
          onChange(clamped)
        }}
        min={0}
        max={100}
        step={1}
        showValue={false}
        showMinMax={false}
        size="lg"
        className="mt-1"
      />
    </div>
  )
}
