"use client"

import { motion } from 'framer-motion'
import { BadgeConfig } from '@/lib/badges'
import { Badge } from './Badge'

interface ProgressBarProps {
  progress: number // 0-100
  currentLabel?: string
  nextLabel?: string
  showLabels?: boolean
  className?: string
  nextBadge?: BadgeConfig | null
}

export function ProgressBar({ 
  progress, 
  currentLabel,
  nextLabel,
  showLabels = true,
  className = '',
  nextBadge
}: ProgressBarProps) {
  return (
    <div className={`w-full ${className}`}>
      {showLabels && (currentLabel || nextLabel) && (
        <div className="flex items-center justify-between mb-2 text-xs text-gray-400">
          {currentLabel && <span>{currentLabel}</span>}
          {nextLabel && (
            <div className="flex items-center gap-2">
              <span>{nextLabel}</span>
              {nextBadge && (
                <div className="scale-75 origin-right">
                  <Badge badge={nextBadge} />
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <div className="relative h-2 bg-[#1a1a1a] rounded-full overflow-hidden border border-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{
            background: 'linear-gradient(90deg, #FFD700 0%, #FFA500 100%)',
            boxShadow: '0 0 10px rgba(255, 215, 0, 0.3)'
          }}
        />
      </div>
      
      {showLabels && (
        <div className="flex items-center justify-center mt-2">
          <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
        </div>
      )}
    </div>
  )
}
