/**
 * Design System Helper Utilities
 * 
 * Pre-composed style objects and utility functions for common patterns
 * These ensure consistency across the application
 */

import { designTokens } from './design-tokens';
import type { CSSProperties } from 'react';

/**
 * Typography Helpers
 */
export const typography = {
  // Heading styles - fully responsive via CSS
  h1: {
    fontFamily: designTokens.typography.fonts.heading.family,
    fontWeight: designTokens.typography.scale.h1.desktop.weight,
    letterSpacing: designTokens.typography.scale.h1.desktop.letterSpacing,
    lineHeight: designTokens.typography.scale.h1.desktop.lineHeight,
  },
  h2: {
    fontFamily: designTokens.typography.fonts.heading.family,
    fontWeight: designTokens.typography.scale.h2.desktop.weight,
    letterSpacing: designTokens.typography.scale.h2.desktop.letterSpacing,
    lineHeight: designTokens.typography.scale.h2.desktop.lineHeight,
  },
  h3: {
    fontFamily: designTokens.typography.fonts.heading.family,
    fontWeight: designTokens.typography.scale.h3.desktop.weight,
    letterSpacing: designTokens.typography.scale.h3.desktop.letterSpacing,
    lineHeight: designTokens.typography.scale.h3.desktop.lineHeight,
  },
  
  // Body text
  bodyLarge: {
    fontFamily: designTokens.typography.fonts.body.family,
    fontSize: designTokens.typography.scale.body.large.size,
    lineHeight: designTokens.typography.scale.body.large.lineHeight,
    fontWeight: designTokens.typography.scale.body.large.weight,
  },
  body: {
    fontFamily: designTokens.typography.fonts.body.family,
    fontSize: designTokens.typography.scale.body.regular.size,
    lineHeight: designTokens.typography.scale.body.regular.lineHeight,
    fontWeight: designTokens.typography.scale.body.regular.weight,
  },
  bodySmall: {
    fontFamily: designTokens.typography.fonts.body.family,
    fontSize: designTokens.typography.scale.body.small.size,
    lineHeight: designTokens.typography.scale.body.small.lineHeight,
    fontWeight: designTokens.typography.scale.body.small.weight,
  },
  
  // Special text
  subtitle: {
    fontFamily: designTokens.typography.fonts.body.family,
    fontSize: designTokens.typography.scale.subtitle.desktop.size,
    lineHeight: designTokens.typography.scale.subtitle.desktop.lineHeight,
    fontWeight: designTokens.typography.scale.subtitle.desktop.weight,
    letterSpacing: designTokens.typography.scale.subtitle.desktop.letterSpacing,
    textTransform: 'uppercase' as const,
  },
  caption: {
    fontFamily: designTokens.typography.fonts.body.family,
    fontSize: designTokens.typography.scale.caption.size,
    lineHeight: designTokens.typography.scale.caption.lineHeight,
    fontWeight: designTokens.typography.scale.caption.weight,
  },
  button: {
    fontFamily: designTokens.typography.fonts.body.family,
    fontSize: designTokens.typography.scale.button.size,
    lineHeight: designTokens.typography.scale.button.lineHeight,
    fontWeight: designTokens.typography.scale.button.weight,
    letterSpacing: designTokens.typography.scale.button.letterSpacing,
    textTransform: designTokens.typography.scale.button.textTransform,
  },
} as const;

/**
 * Button Styles
 */
export const buttonStyles = {
  primary: {
    background: designTokens.gradients.gold.button,
    color: designTokens.colors.neutral.black,
    borderRadius: designTokens.components.button.primary.borderRadius,
    fontSize: designTokens.components.button.primary.fontSize,
    fontWeight: designTokens.components.button.primary.fontWeight,
    letterSpacing: designTokens.components.button.primary.letterSpacing,
    textTransform: designTokens.components.button.primary.textTransform as CSSProperties['textTransform'],
    transition: designTokens.transitions.base,
    border: 'none',
    cursor: 'pointer',
  },
  secondary: {
    background: designTokens.components.button.secondary.background,
    color: designTokens.components.button.secondary.color,
    border: designTokens.components.button.secondary.border,
    borderRadius: designTokens.components.button.secondary.borderRadius,
    fontSize: designTokens.components.button.secondary.fontSize,
    fontWeight: designTokens.components.button.secondary.fontWeight,
    letterSpacing: designTokens.components.button.secondary.letterSpacing,
    transition: designTokens.transitions.base,
    cursor: 'pointer',
  },
} as const;

/**
 * Card Styles
 */
export const cardStyles = {
  glassmorphism: {
    background: designTokens.components.card.glassmorphism.background,
    backdropFilter: designTokens.components.card.glassmorphism.backdropFilter,
    border: designTokens.components.card.glassmorphism.border,
    borderRadius: designTokens.components.card.glassmorphism.borderRadius,
    padding: designTokens.components.card.glassmorphism.padding,
    transition: designTokens.transitions.base,
  },
  performance: {
    background: designTokens.components.card.performance.background,
    border: designTokens.components.card.performance.border,
    borderRadius: designTokens.components.card.performance.borderRadius,
    padding: designTokens.components.card.performance.padding,
    transition: designTokens.transitions.base,
  },
} as const;

/**
 * Common Animation Variants for Framer Motion
 */
export const animationVariants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
  fadeInUp: {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
  fadeInDown: {
    initial: { opacity: 0, y: -30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
  },
  slideInLeft: {
    initial: { opacity: 0, x: -50 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
  slideInRight: {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
} as const;

/**
 * Stagger children animations for lists/grids
 */
export const staggerContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

/**
 * Common gradient backgrounds
 */
export const gradients = {
  goldPrimary: designTokens.gradients.gold.primary,
  goldButton: designTokens.gradients.gold.button,
  goldRadial: designTokens.gradients.gold.radial,
  spotlight: designTokens.gradients.spotlight.default,
  spotlightIntense: designTokens.gradients.spotlight.intense,
  fadeUp: designTokens.gradients.backgrounds.fadeUp,
  fadeDown: designTokens.gradients.backgrounds.fadeDown,
} as const;

/**
 * Common shadow effects
 */
export const shadows = {
  goldGlow: designTokens.shadows.glow.gold,
  goldStrong: designTokens.shadows.glow.goldStrong,
  sm: designTokens.shadows.sm,
  base: designTokens.shadows.base,
  md: designTokens.shadows.md,
  lg: designTokens.shadows.lg,
  xl: designTokens.shadows.xl,
} as const;

/**
 * Section container styles
 */
export const sectionStyles = {
  hero: 'py-20 sm:py-24 md:py-28 lg:py-32 bg-black',
  standard: 'py-12 sm:py-16 md:py-20 lg:py-24 bg-black',
  compact: 'py-8 sm:py-10 md:py-12 lg:py-16 bg-black',
} as const;

/**
 * Container max-widths
 */
export const containers = {
  xs: 'max-w-2xl',
  sm: 'max-w-4xl',
  md: 'max-w-5xl',
  lg: 'max-w-6xl',
  xl: 'max-w-7xl',
  full: 'max-w-full',
} as const;

/**
 * Helper function to create responsive padding
 */
export const responsivePadding = {
  hero: 'px-4 sm:px-6 lg:px-12 py-20 sm:py-32 md:py-40 lg:py-48',
  standard: 'px-4 sm:px-6 lg:px-12 py-12 sm:py-16 md:py-20 lg:py-24',
  compact: 'px-4 sm:px-6 lg:px-8 py-8 sm:py-10 md:py-12 lg:py-16',
} as const;

/**
 * Gold accent utilities
 */
export const goldAccents = {
  border: `1px solid ${designTokens.colors.brand.gold.primary}`,
  borderLight: `1px solid rgba(212, 175, 55, 0.2)`,
  borderHover: `1px solid rgba(212, 175, 55, 0.4)`,
  text: designTokens.colors.brand.gold.primary,
  glow: designTokens.shadows.glow.gold,
  glowStrong: designTokens.shadows.glow.goldStrong,
} as const;

/**
 * Cinematic divider line
 */
export const cinematicDivider: CSSProperties = {
  width: '64px',
  height: '1px',
  background: designTokens.colors.brand.gold.primary,
  opacity: 0.6,
  margin: '24px auto',
};

export default {
  typography,
  buttonStyles,
  cardStyles,
  animationVariants,
  staggerContainer,
  gradients,
  shadows,
  sectionStyles,
  containers,
  responsivePadding,
  goldAccents,
  cinematicDivider,
};

