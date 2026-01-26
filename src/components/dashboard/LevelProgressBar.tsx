"use client"

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ProgressModal } from './ProgressModal'
import { Eye } from 'lucide-react'
import { getLevelProgress } from '@/lib/badges'
import { Badge } from '@/components/badges/Badge'

interface LevelProgressData {
  ratingCount: number
  level: string
  levelEmoji: string
  nextLevel: string | null
  currentLevelMin: number
  nextLevelAt: number
  progressPercent: number
  ratingsNeeded: number
  nextBadge?: any | null
}

export function LevelProgressBar() {
  const [progressData, setProgressData] = useState<LevelProgressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false)

  useEffect(() => {
    fetchLevelProgress()
  }, [])

  const fetchLevelProgress = async () => {
    try {
      const response = await fetch('/api/user/level-progress', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        const levelProgress = getLevelProgress(data.ratingCount)
        setProgressData({
          ...data,
          nextBadge: levelProgress.nextBadge
        })
      }
    } catch (error) {
      console.error('Failed to fetch level progress:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !progressData) {
    return null
  }

  const isMaxLevel = progressData.level === 'Elite Critic'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mb-12"
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
          <div className="flex items-center gap-3">
            <div className="text-3xl">{progressData.levelEmoji}</div>
            <div>
              <h3 
                className="text-lg font-bold text-white"
                style={{ fontFamily: 'var(--font-cinzel), serif' }}
              >
                {progressData.level}
              </h3>
              <p className="text-xs text-gray-400">
                {progressData.ratingCount} {progressData.ratingCount === 1 ? 'rating' : 'ratings'}
              </p>
            </div>
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

        {/* Progress Bar */}
        {isMaxLevel ? (
          <div className="text-center py-2">
            <p className="text-sm text-[#FFD700] font-medium">🎉 Max level reached</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-400">
                Progress to {progressData.nextLevel}
              </p>
              <p className="text-2xl sm:text-3xl font-bold text-[#FFD700]">
                {progressData.progressPercent}%
              </p>
            </div>
            <div className="relative h-2 bg-[#1a1a1a] rounded-full overflow-hidden border border-white/5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressData.progressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-full"
              />
            </div>
            {progressData.nextBadge && (
              <div className="flex items-center justify-center gap-3 mt-3">
                <p className="text-base sm:text-lg text-gray-300">
                  <span className="font-bold text-[#FFD700] text-lg sm:text-xl">{progressData.ratingsNeeded}</span> more {progressData.ratingsNeeded === 1 ? 'rating' : 'ratings'} needed
                </p>
                <Badge badge={progressData.nextBadge} />
              </div>
            )}
          </>
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
