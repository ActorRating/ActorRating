"use client"

import { motion } from 'framer-motion'
import { BadgeConfig } from '@/lib/badges'

interface BadgeProps {
  badge: BadgeConfig
  className?: string
}

export function Badge({ badge, className = '' }: BadgeProps) {
  const isGradient = badge.color.startsWith('linear-gradient')
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${className}`}
      style={{
        background: badge.color,
        color: badge.textColor,
        boxShadow: badge.animated ? '0 0 10px rgba(255, 215, 0, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}
    >
      {badge.icon && (
        <span className="text-sm leading-none" style={{ marginTop: '-1px' }}>
          {badge.icon}
        </span>
      )}
      <span className="leading-none">{badge.name}</span>
      {badge.animated && (
        <motion.span
          animate={{
            opacity: [0.5, 1, 0.5],
            scale: [1, 1.1, 1]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="w-1 h-1 rounded-full bg-current"
        />
      )}
    </motion.div>
  )
}
