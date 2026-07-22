"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { X, Lock, Check } from 'lucide-react'
import { BadgeConfig, BADGE_CONFIGS, getLevelBadge, getLevelProgress } from '@/lib/badges'
import { Badge } from '@/components/badges/Badge'
import { useEffect } from 'react'

interface ProgressModalProps {
  isOpen: boolean
  onClose: () => void
  ratingCount: number
}

export function ProgressModal({ isOpen, onClose, ratingCount }: ProgressModalProps) {
  // Lock body scroll and hide navbar when modal is open
  useEffect(() => {
    if (isOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      document.body.style.overflow = 'hidden'
      document.body.style.paddingRight = `${scrollbarWidth}px`
      // Hide all navbars
      document.body.setAttribute('data-modal-open', 'true')
      const navbars = document.querySelectorAll('nav')
      navbars.forEach(nav => {
        ;(nav as HTMLElement).style.display = 'none'
      })
    } else {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
      // Show navbars again
      document.body.removeAttribute('data-modal-open')
      const navbars = document.querySelectorAll('nav')
      navbars.forEach(nav => {
        ;(nav as HTMLElement).style.display = ''
      })
    }
    
    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
      document.body.removeAttribute('data-modal-open')
      const navbars = document.querySelectorAll('nav')
      navbars.forEach(nav => {
        ;(nav as HTMLElement).style.display = ''
      })
    }
  }, [isOpen])
  // Get all level badges sorted by minRatings
  const levelBadges = BADGE_CONFIGS.filter(b => b.type === 'level').sort((a, b) => 
    (a.minRatings || 0) - (b.minRatings || 0)
  )

  // Get current badge
  const currentBadge = getLevelBadge(ratingCount)
  const levelProgress = getLevelProgress(ratingCount)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            style={{ 
              touchAction: 'none',
              zIndex: 10000,
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-0 flex items-center justify-center p-4"
            style={{
              zIndex: 10001,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                onClose()
              }
            }}
          >
            <div
              className="bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/95 to-black/95 rounded-3xl max-w-lg w-full border border-white/10 shadow-2xl relative flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              style={{
                boxShadow: `
                  0 35px 90px -20px rgba(0, 0, 0, 0.95),
                  0 20px 50px -10px rgba(0, 0, 0, 0.8),
                  0 0 0 1px rgba(255, 255, 255, 0.06),
                  inset 0 1px 0 0 rgba(255, 255, 255, 0.12),
                  inset 0 -1px 0 0 rgba(0, 0, 0, 0.4)
                `,
                maxHeight: '85vh',
              }}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-10 h-10 rounded-full transition-colors flex items-center justify-center backdrop-blur-sm"
                style={{
                  zIndex: 10002,
                  background: 'rgba(26, 26, 26, 0.95)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(26, 26, 26, 1)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(26, 26, 26, 0.95)'
                }}
              >
                <X className="w-5 h-5 text-white" />
              </button>

              <div
                className="flex-1 overflow-y-auto"
                style={{
                  touchAction: 'pan-y',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarGutter: 'stable',
                  scrollbarWidth: 'thin',
                }}
              >
                <div style={{ padding: '1.5rem', paddingTop: '3.5rem' }}>

              {/* Header */}
              <div className="mb-6">
                <h2
                  className="text-2xl font-bold text-white mb-2"
                  style={{ fontFamily: 'var(--font-heading), serif' }}
                >
                  Your Progress
                </h2>
                <p className="text-sm text-gray-400">
                  {ratingCount} {ratingCount === 1 ? 'rating' : 'ratings'} submitted
                </p>
              </div>

              {/* Current Badge */}
              {currentBadge && (
                <div className="mb-6 p-4 rounded-2xl bg-white/5 border border-white/10">
                  <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider">Current Level</p>
                  <Badge badge={currentBadge} />
                </div>
              )}

              {/* Progress to Next */}
              {levelProgress.nextBadge && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-base text-gray-400">Progress to {levelProgress.nextBadge.name}</p>
                    <p className="text-2xl sm:text-3xl font-bold text-[#FFD700]">{Math.round(levelProgress.progress)}%</p>
                  </div>
                  <div className="relative h-2 bg-[#1a1a1a] rounded-full overflow-hidden border border-white/5">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${levelProgress.progress}%` }}
                      transition={{ duration: 1, ease: [0.4, 0, 0.2, 1] }}
                      className="absolute top-0 left-0 h-full rounded-full"
                      style={{
                        background: 'linear-gradient(90deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)',
                        boxShadow: '0 0 20px rgba(255, 215, 0, 0.4)'
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <p className="text-base sm:text-lg text-gray-300">
                      <span className="font-bold text-[#FFD700] text-lg sm:text-xl">{levelProgress.ratingsNeeded}</span> more {levelProgress.ratingsNeeded === 1 ? 'rating' : 'ratings'} needed
                    </p>
                    <Badge badge={levelProgress.nextBadge} />
                  </div>
                </div>
              )}

              {/* All Badges List */}
              <div>
                <p className="text-sm font-semibold text-gray-400 mb-4 uppercase tracking-wider">All Levels</p>
                <div className="space-y-3">
                  {levelBadges.map((badge) => {
                    const isUnlocked = badge.minRatings ? ratingCount >= badge.minRatings : false
                    const isCurrent = currentBadge?.id === badge.id
                    
                    return (
                      <motion.div
                        key={badge.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`p-4 rounded-xl border transition-all ${
                          isCurrent 
                            ? 'bg-[#FFD700]/10 border-[#FFD700]/30' 
                            : isUnlocked
                              ? 'bg-white/5 border-white/10'
                              : 'bg-white/[0.02] border-white/5'
                        }`}
                      >
                        <div className="flex items-center justify-start gap-3">
                          {isUnlocked ? (
                            <div className="w-8 h-8 rounded-full bg-[#FFD700]/20 flex items-center justify-center flex-shrink-0">
                              <Check className="w-5 h-5 text-[#FFD700]" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center flex-shrink-0">
                              <Lock className="w-4 h-4 text-gray-500" />
                            </div>
                          )}
                          <div className="flex-1 text-left">
                            <div className={`font-semibold mb-1 text-left ${isUnlocked ? 'text-white' : 'text-gray-500'}`}>
                              {badge.name}
                            </div>
                            <div className={`text-xs text-left ${isUnlocked ? 'text-[#FFD700]' : 'text-gray-600'}`}>
                              {badge.minRatings} {badge.minRatings === 1 ? 'rating' : 'ratings'}
                            </div>
                          </div>
                          <div className={`w-auto flex-shrink-0 flex items-center justify-center ${!isUnlocked ? 'opacity-40 grayscale' : ''}`}>
                            <Badge badge={badge} />
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              </div>

              {/* Max Level Notice */}
              {!levelProgress.nextBadge && (
                <div className="mt-6 p-4 rounded-xl bg-[#FFD700]/10 border border-[#FFD700]/30">
                  <p className="text-sm text-center text-[#FFD700] font-semibold">
                    🎉 Max level reached!
                  </p>
                </div>
              )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
