"use client"

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ArrowLeft, X } from 'lucide-react'

interface TutorialStep {
  id: string
  title: string
  description: string
  targetSelector: string
  position: 'top' | 'bottom' | 'left' | 'right'
  arrowDirection: 'up' | 'down' | 'left' | 'right'
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'search',
    title: 'Search for Performances',
    description: 'Use the search button to find actors and movies to rate',
    targetSelector: '[aria-label="Search"]',
    position: 'bottom',
    arrowDirection: 'up'
  },
  {
    id: 'dashboard',
    title: 'Your Dashboard',
    description: 'View your ratings and activity here',
    targetSelector: '[aria-label="Home"]',
    position: 'bottom',
    arrowDirection: 'up'
  },
  {
    id: 'profile',
    title: 'Your Profile',
    description: 'Manage your account and view your stats',
    targetSelector: '[aria-label="Profile"]',
    position: 'bottom',
    arrowDirection: 'up'
  },
  {
    id: 'feedback',
    title: 'Send Feedback',
    description: 'Have suggestions? Let us know!',
    targetSelector: 'button:has(.lucide-message-square)',
    position: 'left',
    arrowDirection: 'right'
  }
]

interface InteractiveTutorialProps {
  onComplete: () => void
  onSkip: () => void
}

export function InteractiveTutorial({ onComplete, onSkip }: InteractiveTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const step = tutorialSteps[currentStep]

  useEffect(() => {
    // Wait for the DOM to be ready
    const timer = setTimeout(() => {
      setIsVisible(true)
      updateTargetPosition()
    }, 500)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    updateTargetPosition()
    
    // Update position on resize
    window.addEventListener('resize', updateTargetPosition)
    return () => window.removeEventListener('resize', updateTargetPosition)
  }, [currentStep, step.targetSelector])

  const updateTargetPosition = () => {
    try {
      const element = document.querySelector(step.targetSelector)
      if (element) {
        const rect = element.getBoundingClientRect()
        setTargetRect(rect)
      }
    } catch (error) {
      console.error('Error finding tutorial target:', error)
    }
  }

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      onComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSkip = () => {
    setIsVisible(false)
    setTimeout(onSkip, 300)
  }

  if (!isVisible || !targetRect) {
    return null
  }

  // Calculate tooltip position based on target element
  const getTooltipPosition = () => {
    const padding = 20
    const tooltipOffset = 16

    switch (step.position) {
      case 'bottom':
        return {
          top: targetRect.bottom + tooltipOffset,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translateX(-50%)'
        }
      case 'top':
        return {
          top: targetRect.top - tooltipOffset,
          left: targetRect.left + targetRect.width / 2,
          transform: 'translate(-50%, -100%)'
        }
      case 'left':
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.left - tooltipOffset,
          transform: 'translate(-100%, -50%)'
        }
      case 'right':
        return {
          top: targetRect.top + targetRect.height / 2,
          left: targetRect.right + tooltipOffset,
          transform: 'translateY(-50%)'
        }
    }
  }

  const getArrowStyles = () => {
    switch (step.arrowDirection) {
      case 'up':
        return { top: '-24px', left: '50%', transform: 'translateX(-50%) rotate(180deg)' }
      case 'down':
        return { bottom: '-24px', left: '50%', transform: 'translateX(-50%)' }
      case 'left':
        return { top: '50%', left: '-24px', transform: 'translateY(-50%) rotate(90deg)' }
      case 'right':
        return { top: '50%', right: '-24px', transform: 'translateY(-50%) rotate(-90deg)' }
    }
  }

  const tooltipPosition = getTooltipPosition()
  const arrowStyles = getArrowStyles()

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Dark overlay with hole for spotlight effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[9998] pointer-events-none"
            style={{
              background: `radial-gradient(
                circle at ${targetRect.left + targetRect.width / 2}px ${targetRect.top + targetRect.height / 2}px,
                transparent 0px,
                transparent ${Math.max(targetRect.width, targetRect.height) / 2 + 10}px,
                rgba(0, 0, 0, 0.75) ${Math.max(targetRect.width, targetRect.height) / 2 + 30}px,
                rgba(0, 0, 0, 0.75) 100%
              )`
            }}
          />

          {/* Highlighted element border */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="fixed z-[9999] pointer-events-none rounded-xl border-2 border-[#FFD700] shadow-[0_0_20px_rgba(255,215,0,0.5)]"
            style={{
              top: targetRect.top - 4,
              left: targetRect.left - 4,
              width: targetRect.width + 8,
              height: targetRect.height + 8
            }}
          />

          {/* Tooltip */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed z-[10000] max-w-sm pointer-events-auto"
            style={tooltipPosition}
          >
            <div 
              className="bg-gradient-to-br from-[#1a1a1a]/98 via-[#0f0f0f]/98 to-black/98 rounded-2xl p-6 border border-[#FFD700]/30 shadow-2xl backdrop-blur-xl relative"
              style={{
                boxShadow: `
                  0 20px 60px -10px rgba(0, 0, 0, 0.9),
                  0 0 0 1px rgba(255, 215, 0, 0.3),
                  inset 0 1px 0 0 rgba(255, 255, 255, 0.1)
                `
              }}
            >
              {/* Arrow pointing to target */}
              <div 
                className="absolute w-0 h-0"
                style={{
                  ...arrowStyles,
                  borderLeft: '12px solid transparent',
                  borderRight: '12px solid transparent',
                  borderBottom: '12px solid #FFD700',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))'
                }}
              />

              {/* Close button */}
              <button
                onClick={handleSkip}
                className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors"
                aria-label="Close tutorial"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Content */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
                  {step.title}
                </h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>

              {/* Progress dots */}
              <div className="flex justify-center gap-2 mb-4">
                {tutorialSteps.map((_, index) => (
                  <div
                    key={index}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      index === currentStep 
                        ? 'w-8 bg-[#FFD700]' 
                        : 'w-2 bg-gray-600'
                    }`}
                  />
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={handleSkip}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  Skip
                </button>

                <div className="flex items-center gap-2">
                  {currentStep > 0 && (
                    <button
                      onClick={handleBack}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span className="text-sm font-medium">Back</span>
                    </button>
                  )}

                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#FFD700] hover:bg-[#FFA500] text-black font-semibold transition-colors shadow-lg"
                  >
                    <span className="text-sm font-medium">
                      {currentStep < tutorialSteps.length - 1 ? 'Next' : 'Done'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

