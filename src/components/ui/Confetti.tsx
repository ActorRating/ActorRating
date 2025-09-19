"use client"

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ConfettiProps {
  active: boolean
  duration?: number
  particleCount?: number
}

interface ConfettiParticle {
  id: number
  x: number
  y: number
  size: number
  color: string
  velocity: { x: number; y: number }
  rotation: number
  rotationSpeed: number
}

const colors = [
  '#8b5cf6', // primary
  '#7c3aed', // accent
  '#fbbf24', // yellow
  '#34d399', // emerald
  '#60a5fa', // blue
  '#f472b6', // pink
  '#fb7185', // rose
]

export function Confetti({ active, duration = 3000, particleCount = 50 }: ConfettiProps) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([])

  useEffect(() => {
    if (!active) {
      setParticles([])
      return
    }

    // Create initial particles
    const newParticles: ConfettiParticle[] = []
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * window.innerWidth,
        y: -20,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        velocity: {
          x: (Math.random() - 0.5) * 4,
          y: Math.random() * 3 + 2,
        },
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 5,
      })
    }
    setParticles(newParticles)

    // Clear particles after duration
    const timer = setTimeout(() => {
      setParticles([])
    }, duration)

    return () => clearTimeout(timer)
  }, [active, duration, particleCount])

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute"
            initial={{
              x: particle.x,
              y: particle.y,
              rotate: particle.rotation,
              scale: 0,
            }}
            animate={{
              x: particle.x + particle.velocity.x * 100,
              y: window.innerHeight + 50,
              rotate: particle.rotation + particle.rotationSpeed * 100,
              scale: [0, 1, 1, 0],
            }}
            exit={{
              opacity: 0,
              scale: 0,
            }}
            transition={{
              duration: duration / 1000,
              ease: "easeOut",
              scale: {
                times: [0, 0.1, 0.9, 1],
                ease: "easeOut",
              },
            }}
            style={{
              width: particle.size,
              height: particle.size,
              backgroundColor: particle.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

// Celebration confetti with multiple bursts
export function CelebrationConfetti({ active, duration = 4000 }: { active: boolean; duration?: number }) {
  const [burstCount, setBurstCount] = useState(0)

  useEffect(() => {
    if (!active) {
      setBurstCount(0)
      return
    }

    // Create multiple bursts
    const bursts = [0, 500, 1000, 1500] // Staggered timing
    const timeouts: NodeJS.Timeout[] = []

    bursts.forEach((delay, index) => {
      const timeout = setTimeout(() => {
        setBurstCount(index + 1)
      }, delay)
      timeouts.push(timeout)
    })

    // Clear after duration
    const clearTimer = setTimeout(() => {
      setBurstCount(0)
    }, duration)
    timeouts.push(clearTimer)

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout))
    }
  }, [active, duration])

  return (
    <>
      {Array.from({ length: burstCount }, (_, i) => (
        <Confetti
          key={i}
          active={true}
          duration={2000}
          particleCount={30}
        />
      ))}
    </>
  )
}
