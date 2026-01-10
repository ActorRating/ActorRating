"use client"

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

interface LevelData {
  level: string
  levelEmoji: string
  ratingCount: number
}

export function LevelBadge() {
  const [levelData, setLevelData] = useState<LevelData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLevelData()
  }, [])

  const fetchLevelData = async () => {
    try {
      const response = await fetch('/api/user/level-progress', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setLevelData({
          level: data.level,
          levelEmoji: data.levelEmoji,
          ratingCount: data.ratingCount
        })
      }
    } catch (error) {
      console.error('Failed to fetch level data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !levelData) {
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#1a1a1a]/50 border border-white/5 backdrop-blur-sm"
    >
      <span className="text-lg">{levelData.levelEmoji}</span>
      <span className="text-sm font-medium text-gray-300">{levelData.level}</span>
    </motion.div>
  )
}
