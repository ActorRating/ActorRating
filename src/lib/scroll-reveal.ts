import type { Transition, Viewport } from 'framer-motion'

/**
 * Scroll-reveal defaults tuned for Mobile Safari: positive rootMargin starts
 * the intersection slightly before the element enters the paint viewport, so
 * opacity/transform can run during momentum scroll instead of one batch at rest.
 * Pair with `amount: "some"` (any overlap) — numeric thresholds often fire late on iOS.
 */
export const SCROLL_REVEAL_VIEWPORT: Viewport = {
  once: true,
  amount: 'some',
  margin: '130px 0px 110px 0px',
}

export const SCROLL_REVEAL_TRANSITION: Transition = {
  duration: 0.52,
  ease: [0.16, 1, 0.3, 1],
}

export function scrollRevealStaggerDelay(index: number, step = 0.055, cap = 0.22): number {
  return Math.min(index * step, cap)
}
