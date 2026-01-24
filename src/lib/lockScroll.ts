/**
 * Scroll lock utility for mobile touch interactions
 * Locks page scroll during slider drag to prevent scroll takeover
 */

export function lockScroll() {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = 'hidden'
    document.body.style.touchAction = 'none'
  }
}

export function unlockScroll() {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = ''
    document.body.style.touchAction = 'pan-y pinch-zoom' // Restore trackpad scrolling
  }
}

