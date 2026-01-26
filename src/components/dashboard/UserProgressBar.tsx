"use client"

import { useEffect, useState } from 'react'
import { ProgressBar } from '@/components/badges/ProgressBar'
import { getLevelProgress } from '@/lib/badges'
import { motion } from 'framer-motion'
import { UserBadges } from './UserBadges'
import { ProgressModal } from './ProgressModal'
import { Eye } from 'lucide-react'
import { Badge } from '@/components/badges/Badge'

export function UserProgressBar() {
  const [progressData, setProgressData] = useState<{
    ratingCount: number
    progress: number
    ratingsNeeded: number
    currentLabel: string
    nextLabel: string
    nextBadge: any | null
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false)

  useEffect(() => {
    fetchProgressData()
  }, [])

  const [isFirstRater, setIsFirstRater] = useState(false)

  const fetchProgressData = async () => {
    try {
      const response = await fetch('/api/user/level-progress', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setIsFirstRater(data.isFirstRater || false)
        
        // Don't show progress bar for first rater
        if (data.isFirstRater) {
          setLoading(false)
          return
        }
        
        const levelProgress = getLevelProgress(data.ratingCount)
        
        setProgressData({
          ratingCount: data.ratingCount,
          progress: levelProgress.progress,
          ratingsNeeded: levelProgress.ratingsNeeded,
          currentLabel: levelProgress.currentBadge?.name || '',
          nextLabel: levelProgress.nextBadge?.name || '',
          nextBadge: levelProgress.nextBadge
        })
      }
    } catch (error) {
      console.error('Failed to fetch progress data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Show First Rater badge display if user is first rater
  if (isFirstRater && !loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-8"
      >
        <div
          className="relative rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden p-8 sm:p-10 md:p-12 max-w-2xl mx-auto"
          style={{
            boxShadow: `
              0 25px 70px -15px rgba(0, 0, 0, 0.9),
              0 15px 40px -10px rgba(0, 0, 0, 0.7),
              0 0 0 1px rgba(255, 255, 255, 0.05),
              inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
              inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
            `,
          }}
        >
          {/* First Rater Badge Display */}
          <UserBadges />
        </div>
      </motion.div>
    )
  }

  if (loading || !progressData) {
    return null
  }

  // Show progress bar even at 0 ratings to encourage first rating
  // Only hide if user has reached max level (Elite Critic with 200+ ratings)
  if (progressData.ratingsNeeded === 0 && progressData.ratingCount >= 200) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-8"
    >
      <div
        className="relative rounded-3xl border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden p-5 sm:p-6"
        style={{
          boxShadow: `
            0 25px 70px -15px rgba(0, 0, 0, 0.9),
            0 15px 40px -10px rgba(0, 0, 0, 0.7),
            0 0 0 1px rgba(255, 255, 255, 0.05),
            inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
            inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
          `,
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-white" style={{ fontFamily: 'var(--font-cinzel), serif' }}>
              Your Progress
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {progressData.ratingCount} {progressData.ratingCount === 1 ? 'rating' : 'ratings'}
            </p>
          </div>
          <button
            onClick={() => setIsProgressModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-2 py-2 sm:px-3 sm:py-1.5 rounded-full bg-white/5 hover:bg-white/10 active:bg-white/15 transition-colors text-gray-300 hover:text-white w-9 h-9 sm:w-auto sm:h-auto"
            aria-label="View progress details"
          >
            <Eye className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline text-xs">Details</span>
          </button>
        </div>

        {/* Current Badge */}
        <div className="mb-4">
          <UserBadges />
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-gray-400">
              {progressData.nextLabel ? `Progress to ${progressData.nextLabel}` : 'Max level'}
            </p>
            <p className="text-2xl sm:text-3xl font-bold text-[#FFD700]">
              {Math.round(progressData.progress)}%
            </p>
          </div>
          <div className="relative h-2 bg-[#1a1a1a] rounded-full overflow-hidden border border-white/5">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progressData.progress}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{
                background: 'linear-gradient(90deg, #FFD700 0%, #FFA500 100%)',
                boxShadow: '0 0 10px rgba(255, 215, 0, 0.3)'
              }}
            />
          </div>
        </div>

        {/* Next Level Info with Badge */}
        {progressData.ratingsNeeded > 0 && progressData.nextLabel && progressData.nextBadge && (
          <div className="flex items-center justify-center gap-3">
            <p className="text-base sm:text-lg text-gray-300">
              <span className="font-bold text-[#FFD700] text-lg sm:text-xl">{progressData.ratingsNeeded}</span> more {progressData.ratingsNeeded === 1 ? 'rating' : 'ratings'} to reach
            </p>
            <Badge badge={progressData.nextBadge} />
          </div>
        )}
      </div>

      {/* Progress Modal */}
      {progressData && (
        <ProgressModal
          isOpen={isProgressModalOpen}
          onClose={() => setIsProgressModalOpen(false)}
          ratingCount={progressData.ratingCount}
        />
      )}
    </motion.div>
  )
}
