"use client"

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface LevelProgressData {
  ratingCount: number
  level: string
  levelEmoji: string
  nextLevel: string | null
  currentLevelMin: number
  nextLevelAt: number
  progressPercent: number
  ratingsNeeded: number
}

export function LevelProgressBar() {
  const [progressData, setProgressData] = useState<LevelProgressData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLevelProgress()
  }, [])

  const fetchLevelProgress = async () => {
    try {
      const response = await fetch('/api/user/level-progress', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setProgressData(data)
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
        className="relative rounded-[2rem] border border-transparent bg-gradient-to-br from-[#1a1a1a]/95 via-[#0f0f0f]/90 to-black/95 backdrop-blur-2xl overflow-hidden p-6 sm:p-8"
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
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Level Info */}
          <div className="flex items-center gap-4">
            <div className="text-4xl">{progressData.levelEmoji}</div>
            <div>
              <h3 
                className="text-xl sm:text-2xl font-bold text-white mb-1"
                style={{ fontFamily: 'var(--font-cinzel), serif' }}
              >
                {progressData.level}
              </h3>
              <p className="text-sm text-gray-400">
                {progressData.ratingCount} {progressData.ratingCount === 1 ? 'rating' : 'ratings'}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="flex-1 sm:max-w-md">
            {isMaxLevel ? (
              <div className="text-center">
                <p className="text-sm text-[#FFD700] font-medium">Max level reached</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">
                    {progressData.ratingsNeeded} {progressData.ratingsNeeded === 1 ? 'rating' : 'ratings'} to {progressData.nextLevel}
                  </span>
                  <span className="text-sm text-gray-400">
                    {progressData.progressPercent}%
                  </span>
                </div>
                <div className="relative h-2 bg-[#1a1a1a] rounded-full overflow-hidden border border-white/5">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${progressData.progressPercent}%` }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                    className="h-full bg-gradient-to-r from-[#FFD700] to-[#FFA500] rounded-full"
                  />
                </div>
                <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
                  <span>{progressData.currentLevelMin}</span>
                  <span>{progressData.nextLevelAt}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}
