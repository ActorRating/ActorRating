"use client"

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Film, Star, Award, Sparkles } from 'lucide-react'

interface LevelData {
  level: string
  ratingCount: number
}

const getLevelIcon = (level: string) => {
  switch (level) {
    case 'Viewer':
      return Film
    case 'Critic':
      return Star
    case 'Senior Critic':
      return Award
    case 'Elite Critic':
      return Sparkles
    default:
      return Film
  }
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

  const Icon = getLevelIcon(levelData.level)

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#141414] border border-white/[0.06]"
    >
      <Icon className="w-4 h-4 text-gray-400" />
      <span className="text-sm font-medium text-gray-300">{levelData.level}</span>
    </motion.div>
  )
}
