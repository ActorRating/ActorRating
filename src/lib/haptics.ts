/**
 * Haptic feedback utility for mobile devices
 * Provides discrete, intentional haptics that feel premium and non-annoying
 * 
 * Note: iOS Safari doesn't support the Vibration API, so haptics are Android-only
 */

// Detect iOS
const isIOS = typeof window !== 'undefined' && 
  /iPad|iPhone|iPod/.test(navigator.userAgent) && 
  !(window as any).MSStream

export const haptic = {
  /**
   * Light haptic - subtle selection feedback
   * Use for: touch start, minor value changes
   * Note: iOS doesn't support this, silently fails
   */
  light() {
    // iOS doesn't support Vibration API - skip
    if (isIOS) return
    
    if ('vibrate' in navigator) {
      navigator.vibrate(8)
    }
  },

  /**
   * Medium haptic - confirmation feedback
   * Use for: touch end, milestone values
   * Note: iOS doesn't support this, silently fails
   */
  medium() {
    // iOS doesn't support Vibration API - skip
    if (isIOS) return
    
    if ('vibrate' in navigator) {
      navigator.vibrate(15)
    }
  },

  /**
   * Heavy haptic - strong feedback
   * Use for: important actions, major milestones
   * Note: iOS doesn't support this, silently fails
   */
  heavy() {
    // iOS doesn't support Vibration API - skip
    if (isIOS) return
    
    if ('vibrate' in navigator) {
      navigator.vibrate(25)
    }
  },
}

