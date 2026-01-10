"use client"

import { useEffect, useState } from 'react'
import { ProgressBar } from '@/components/badges/ProgressBar'
import { getLevelProgress } from '@/lib/badges'
import { motion } from 'framer-motion'

export function UserProgressBar() {
  const [progressData, setProgressData] = useState<{
    ratingCount: number
    progress: number
    ratingsNeeded: number
    currentLabel: string
    nextLabel: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProgressData()
  }, [])

  const fetchProgressData = async () => {
    try {
      const response = await fetch('/api/user/level-progress', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        const levelProgress = getLevelProgress(data.ratingCount)
        
        setProgressData({
          ratingCount: data.ratingCount,
          progress: levelProgress.progress,
          ratingsNeeded: levelProgress.ratingsNeeded,
          currentLabel: levelProgress.currentBadge?.name || '',
          nextLabel: levelProgress.nextBadge?.name || ''
        })
      }
    } catch (error) {
      console.error('Failed to fetch progress data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !progressData || progressData.ratingsNeeded === 0) {
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
        <ProgressBar
          progress={progressData.progress}
          currentLabel={progressData.currentLabel}
          nextLabel={progressData.nextLabel}
          showLabels={true}
        />
        <p className="text-sm text-gray-400 mt-3 text-center">
          {progressData.ratingsNeeded} {progressData.ratingsNeeded === 1 ? 'rating' : 'ratings'} to {progressData.nextLabel}
        </p>
      </div>
    </motion.div>
  )
}
