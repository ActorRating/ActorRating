"use client"

import { Variants } from "framer-motion"

// Global animation defaults to keep things consistent and premium-feeling
export const defaultTransition = {
  duration: 0.4, // Quick and subtle for cinematic feel
  ease: "easeOut" as const,
}

// Fades in and slides up slightly (reduced from 20px to 8px for premium feel)
export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 8 },
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

// Scale in animation (for components that need it)
export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { ...defaultTransition },
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
    return { fadeInUp, fadeIn }
  }

  const rmFade: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { duration: 0.4, ease: "easeOut" } },
  }

  return {
    fadeInUp: rmFade,
    fadeIn: rmFade,
  }
}


