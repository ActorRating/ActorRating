/**
 * Haptic feedback utility for mobile devices
 * Provides discrete, intentional haptics that feel premium and non-annoying
 */

export const haptic = {
  /**
   * Light haptic - subtle selection feedback
   * Use for: touch start, minor value changes
   */
  light() {
    if ('vibrate' in navigator) {
      navigator.vibrate(8)
    }
  },

  /**
   * Medium haptic - confirmation feedback
   * Use for: touch end, milestone values
   */
  medium() {
    if ('vibrate' in navigator) {
      navigator.vibrate(15)
    }
  },

  /**
   * Heavy haptic - strong feedback
   * Use for: important actions, major milestones
   */
  heavy() {
    if ('vibrate' in navigator) {
      navigator.vibrate(25)
    }
  },
}

