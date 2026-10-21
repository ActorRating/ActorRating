/**
 * Pure rules for first-party `qualified_visit` (dwell + real interaction).
 * Kept free of DOM so unit tests can exercise fire-once / no-interaction cases.
 */

export const QUALIFIED_VISIT_DWELL_MS = 5_000
/** Fraction of scrollable document height that counts as a real scroll. */
export const QUALIFIED_VISIT_SCROLL_RATIO = 0.25

export type QualifiedVisitInteraction =
  | "pointermove"
  | "touchstart"
  | "scroll"
  | "keydown"

export type QualifiedVisitState = {
  /** Milliseconds the document was visible (Page Visibility API). */
  visibleAccumulatedMs: number
  /** Timestamp when the tab last became visible; null when hidden. */
  visibleSince: number | null
  hasInteraction: boolean
  lastInteraction: QualifiedVisitInteraction | null
  fired: boolean
}

export function createQualifiedVisitState(): QualifiedVisitState {
  return {
    visibleAccumulatedMs: 0,
    visibleSince: null,
    hasInteraction: false,
    lastInteraction: null,
    fired: false,
  }
}

/** Call when visibility changes. `now` is performance.now() or Date.now(). */
export function onVisibilityChange(
  state: QualifiedVisitState,
  isVisible: boolean,
  now: number,
): QualifiedVisitState {
  if (state.fired) return state
  if (isVisible) {
    if (state.visibleSince == null) {
      return { ...state, visibleSince: now }
    }
    return state
  }
  if (state.visibleSince == null) return state
  const delta = Math.max(0, now - state.visibleSince)
  return {
    ...state,
    visibleAccumulatedMs: state.visibleAccumulatedMs + delta,
    visibleSince: null,
  }
}

/** Flush open visibility segment up to `now` (call on timers / before fire check). */
export function flushVisibleTime(
  state: QualifiedVisitState,
  now: number,
): QualifiedVisitState {
  if (state.fired || state.visibleSince == null) return state
  const delta = Math.max(0, now - state.visibleSince)
  return {
    ...state,
    visibleAccumulatedMs: state.visibleAccumulatedMs + delta,
    visibleSince: now,
  }
}

export function markInteraction(
  state: QualifiedVisitState,
  interaction: QualifiedVisitInteraction,
): QualifiedVisitState {
  if (state.fired) return state
  return {
    ...state,
    hasInteraction: true,
    lastInteraction: interaction,
  }
}

export function dwellMet(state: QualifiedVisitState, now: number): boolean {
  const flushed = flushVisibleTime(state, now)
  return flushed.visibleAccumulatedMs >= QUALIFIED_VISIT_DWELL_MS
}

/**
 * True when both dwell and a real interaction are satisfied and we have not fired yet.
 * Does not mutate; caller must mark `fired` after a successful send.
 */
export function shouldFireQualifiedVisit(
  state: QualifiedVisitState,
  now: number,
): boolean {
  if (state.fired) return false
  if (!state.hasInteraction) return false
  return dwellMet(state, now)
}

export function markFired(state: QualifiedVisitState): QualifiedVisitState {
  return { ...state, fired: true, visibleSince: null }
}

/** Scroll depth as a 0–1 fraction of scrollable range (0 when not scrollable). */
export function scrollDepthRatio(
  scrollY: number,
  viewportHeight: number,
  documentHeight: number,
): number {
  const range = Math.max(0, documentHeight - viewportHeight)
  if (range <= 0) return 0
  return Math.min(1, Math.max(0, scrollY / range))
}

export function scrollPastThreshold(
  scrollY: number,
  viewportHeight: number,
  documentHeight: number,
  threshold = QUALIFIED_VISIT_SCROLL_RATIO,
): boolean {
  return scrollDepthRatio(scrollY, viewportHeight, documentHeight) >= threshold
}
