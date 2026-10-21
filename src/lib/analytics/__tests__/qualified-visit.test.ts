/**
 * @jest-environment node
 */

import {
  QUALIFIED_VISIT_DWELL_MS,
  createQualifiedVisitState,
  flushVisibleTime,
  markFired,
  markInteraction,
  onVisibilityChange,
  scrollPastThreshold,
  shouldFireQualifiedVisit,
} from "@/lib/analytics/qualified-visit"

describe("qualified_visit rules", () => {
  it("does not fire without interaction even after long dwell", () => {
    let state = createQualifiedVisitState()
    state = onVisibilityChange(state, true, 0)
    state = flushVisibleTime(state, QUALIFIED_VISIT_DWELL_MS + 1_000)
    expect(shouldFireQualifiedVisit(state, QUALIFIED_VISIT_DWELL_MS + 1_000)).toBe(false)
  })

  it("does not fire with interaction before dwell", () => {
    let state = createQualifiedVisitState()
    state = onVisibilityChange(state, true, 0)
    state = markInteraction(state, "pointermove")
    state = flushVisibleTime(state, 1_000)
    expect(shouldFireQualifiedVisit(state, 1_000)).toBe(false)
  })

  it("fires once when dwell and interaction are both met", () => {
    let state = createQualifiedVisitState()
    state = onVisibilityChange(state, true, 0)
    state = markInteraction(state, "scroll")
    const t = QUALIFIED_VISIT_DWELL_MS + 50
    state = flushVisibleTime(state, t)
    expect(shouldFireQualifiedVisit(state, t)).toBe(true)
    state = markFired(state)
    expect(shouldFireQualifiedVisit(state, t + 10_000)).toBe(false)
  })

  it("accumulates dwell only while visible", () => {
    let state = createQualifiedVisitState()
    state = onVisibilityChange(state, true, 0)
    state = onVisibilityChange(state, false, 2_000)
    state = markInteraction(state, "keydown")
    expect(shouldFireQualifiedVisit(state, 2_000)).toBe(false)
    state = onVisibilityChange(state, true, 10_000)
    state = flushVisibleTime(state, 10_000 + 3_500)
    expect(shouldFireQualifiedVisit(state, 10_000 + 3_500)).toBe(true)
  })

  it("treats scroll past ~25% as a real interaction threshold", () => {
    expect(scrollPastThreshold(0, 800, 4000)).toBe(false)
    expect(scrollPastThreshold(799, 800, 4000)).toBe(false)
    expect(scrollPastThreshold(800, 800, 4000)).toBe(true)
    expect(scrollPastThreshold(100, 800, 800)).toBe(false)
  })

  it("never auto-fires from visibility alone", () => {
    let state = createQualifiedVisitState()
    state = onVisibilityChange(state, true, 0)
    for (let t = 0; t < 20_000; t += 1_000) {
      state = flushVisibleTime(state, t)
      expect(shouldFireQualifiedVisit(state, t)).toBe(false)
    }
  })
})
