"use client"

import { Variants } from "framer-motion"

// Runtime detection helpers (call these in components, not at module level)
export function getPrefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function getIsMobile(): boolean {
  if (typeof window === 'undefined') return false
  return window.innerWidth < 768
}

// For use in components that need these values
export const prefersReducedMotion = typeof window !== 'undefined' 
  ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
  : false

export const isMobile = typeof window !== 'undefined'
  ? window.innerWidth < 768
  : false

// Global animation defaults - GPU-safe only (transform + opacity)
export const defaultTransition = {
  duration: 0.4,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
}

// Mobile-optimized transition (faster, less intensive)
export const mobileTransition = {
  duration: 0.2,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
}

// GPU-safe fade in and slide up (transform only, no layout properties)
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { ...defaultTransition },
  },
}

// Mobile-optimized fade in up (reduced movement)
export const fadeInUpMobile: Variants = {
  hidden: { opacity: 0, y: 4 },
  show: {
    opacity: 1,
    y: 0,
    transition: { ...mobileTransition },
  },
}

// Simple fade in (opacity only)
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { ...defaultTransition },
  },
}

// Scale in animation (transform only)
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { ...defaultTransition },
  },
}

// Reduced stagger for better performance (50ms instead of 200ms)
export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05, // Reduced from potential higher values
      delayChildren: 0.05, // Reduced delay
    },
  },
}

// Mobile-optimized stagger (even less)
export const staggerContainerMobile: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.03, // Minimal stagger on mobile
      delayChildren: 0,
    },
  },
}

// Helper to apply once-on-view behavior consistently with mobile optimization
export function getMotionProps() {
  const mobile = typeof window !== 'undefined' && window.innerWidth < 768
  return {
    initial: "hidden" as const,
    whileInView: "show" as const,
    viewport: { 
      once: true, 
      amount: mobile ? 0.1 : 0.2, // Less threshold on mobile
      margin: mobile ? "-50px" : "-100px" // Start animation earlier on mobile
    },
  }
}

// Get appropriate animation variant based on device and preferences
export function getOptimizedVariant(variant: 'fadeInUp' | 'fadeIn' | 'scaleIn' = 'fadeInUp') {
  if (prefersReducedMotion) {
    return fadeIn // Only fade for reduced motion
  }
  
  if (isMobile) {
    switch (variant) {
      case 'fadeInUp':
        return fadeInUpMobile
      case 'fadeIn':
        return fadeIn
      case 'scaleIn':
        return fadeIn // No scale on mobile
      default:
        return fadeIn
    }
  }
  
  switch (variant) {
    case 'fadeInUp':
      return fadeInUp
    case 'fadeIn':
      return fadeIn
    case 'scaleIn':
      return scaleIn
    default:
      return fadeIn
  }
}

// Get appropriate stagger container
export function getStaggerContainer() {
  if (prefersReducedMotion) {
    return {
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: {
          staggerChildren: 0,
          delayChildren: 0,
        },
      },
    }
  }
  
  return isMobile ? staggerContainerMobile : staggerContainer
}

// Reduced-motion aware variants factory
export function createReducedMotionVariants(prefersReducedMotion: boolean) {
  if (!prefersReducedMotion) {
    return { fadeInUp, fadeIn, scaleIn }
  }

  const rmFade: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.2, ease: "easeOut" } },
  }

  return {
    fadeInUp: rmFade,
    fadeIn: rmFade,
    scaleIn: rmFade,
  }
}


