"use client"

import { motion } from 'framer-motion'
import { BadgeConfig } from '@/lib/badges'
import * as LucideIcons from 'lucide-react'

interface BadgeProps {
  badge: BadgeConfig
  className?: string
}

export function Badge({ badge, className = '' }: BadgeProps) {
  const isGradient = badge.color.startsWith('linear-gradient')
  
  // Get icon component if iconName is provided
  const IconComponent = badge.iconName 
    ? (LucideIcons[badge.iconName as keyof typeof LucideIcons] as React.ComponentType<{ className?: string; size?: number; style?: React.CSSProperties }>)
    : null
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold ${className}`}
      style={{
        background: badge.color,
        color: badge.textColor,
        boxShadow: badge.animated 
          ? (badge.id === 'founding-member' 
              ? '0 0 6px rgba(255, 215, 0, 0.15)' // Ultra-subtle glow for Founding Member
              : '0 0 10px rgba(255, 215, 0, 0.3)') // Regular glow for other animated badges
          : '0 2px 4px rgba(0, 0, 0, 0.1)'
      }}
    >
      {IconComponent && (
        <IconComponent className="w-3.5 h-3.5" style={{ marginTop: '-1px' }} />
      )}
      {badge.icon && !IconComponent && (
        <span className="text-sm leading-none" style={{ marginTop: '-1px' }}>
          {badge.icon}
        </span>
      )}
      <span className="leading-none">{badge.name}</span>
      {badge.animated && (
        <motion.span
          animate={{
            opacity: badge.id === 'founding-member' 
              ? [0.7, 0.85, 0.7] // Ultra-subtle for Founding Member
              : [0.5, 1, 0.5], // Regular animation for other badges
            scale: badge.id === 'founding-member'
              ? [1, 1.02, 1] // Ultra-subtle scale for Founding Member
              : [1, 1.1, 1] // Regular scale for other badges
          }}
          transition={{
            duration: badge.id === 'founding-member' ? 4 : 2, // Slower for Founding Member
            repeat: Infinity,
            ease: 'easeInOut'
          }}
          className="w-1 h-1 rounded-full bg-current"
        />
      )}
    </motion.div>
  )
}
