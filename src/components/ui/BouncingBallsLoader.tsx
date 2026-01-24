"use client"

import { motion } from 'framer-motion'

interface BouncingBallsLoaderProps {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  className?: string
  showText?: boolean
  text?: string
}

const sizeMap = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
}

const bounceHeightMap = {
  sm: -8,
  md: -12,
  lg: -16,
}

export function BouncingBallsLoader({
  size = 'md',
  color = '#FFD700',
  className = '',
  showText = false,
  text = 'Loading',
}: BouncingBallsLoaderProps) {
  const ballSize = sizeMap[size]
  const bounceHeight = bounceHeightMap[size]

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div className="flex items-center justify-center gap-2 mb-4">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            className={`${ballSize} rounded-full`}
            style={{ backgroundColor: color }}
            animate={{
              y: [0, bounceHeight, 0],
            }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              ease: "easeInOut",
              delay: index * 0.15,
            }}
          />
        ))}
      </div>
      {showText && (
        <p className="text-foreground text-base">{text}</p>
      )}
    </div>
  )
}


