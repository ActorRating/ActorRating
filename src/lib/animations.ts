"use client"

import { Variants } from "framer-motion"

// Global animation defaults to keep things consistent and premium-feeling
export const defaultTransition = {
  duration: 0.5, // keep within 0.4–0.7s
  ease: "easeOut" as const,
}

// Fades in and slides up slightly
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { ...defaultTransition },
  },
}

// Simple fade in
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { ...defaultTransition },
  },
}

// Scales in softly
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { ...defaultTransition },
  },
}

// Staggered container for cascading child animations
export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
}

// Helper to apply once-on-view behavior consistently
export function getMotionProps() {
  return {
    initial: "hidden" as const,
    whileInView: "show" as const,
    viewport: { once: true, amount: 0.2 },
  }
}

// Reduced-motion aware variants factory (optional use)
export function createReducedMotionVariants(prefersReducedMotion: boolean) {
  if (!prefersReducedMotion) {
    return { fadeInUp, fadeIn, scaleIn, staggerContainer }
  }

  const rmFade: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
  }

  return {
    fadeInUp: rmFade,
    fadeIn: rmFade,
    scaleIn: rmFade,
    staggerContainer,
  }
}


