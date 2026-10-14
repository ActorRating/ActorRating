/** Distance that commits a swipe without a fast flick. */
export const SWIPE_DISTANCE = 76
/** A shorter flick still commits when it is clearly horizontal and quick. */
export const SWIPE_FLICK_DISTANCE = 40
export const SWIPE_FLICK_VELOCITY = 0.55

export function shouldCommitSwipe(
  dx: number,
  elapsedMs: number,
): "left" | "right" | null {
  const distance = Math.abs(dx)
  const velocity = elapsedMs > 0 ? distance / elapsedMs : 0
  const commit = distance >= SWIPE_DISTANCE || (distance >= SWIPE_FLICK_DISTANCE && velocity >= SWIPE_FLICK_VELOCITY)
  if (!commit) return null
  return dx < 0 ? "left" : "right"
}
