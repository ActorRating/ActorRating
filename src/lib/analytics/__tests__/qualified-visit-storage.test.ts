/**
 * @jest-environment node
 */

import {
  hasQualifiedVisitBeenSent,
  markQualifiedVisitSent,
  qualifiedVisitStorageKey,
} from "@/lib/analytics/qualified-visit-storage"
import {
  createQualifiedVisitState,
  flushVisibleTime,
  markFired,
  markInteraction,
  onVisibilityChange,
  shouldFireQualifiedVisit,
  QUALIFIED_VISIT_DWELL_MS,
} from "@/lib/analytics/qualified-visit"

function installMemorySessionStorage() {
  const store = new Map<string, string>()
  const memory: Storage = {
    get length() {
      return store.size
    },
    clear: () => store.clear(),
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    setItem: (k, v) => {
      store.set(k, String(v))
    },
    removeItem: (k) => {
      store.delete(k)
    },
    key: (i) => [...store.keys()][i] ?? null,
  }
  Object.defineProperty(globalThis, "sessionStorage", {
    value: memory,
    configurable: true,
    writable: true,
  })
  return store
}

describe("qualified_visit sessionStorage guard", () => {
  beforeEach(() => {
    installMemorySessionStorage()
  })

  it("builds a stable qv:{pathname}{search} key", () => {
    expect(qualifiedVisitStorageKey("/actors/1", "")).toBe("qv:/actors/1")
    expect(qualifiedVisitStorageKey("/actors/1", "?utm=x")).toBe(
      "qv:/actors/1?utm=x",
    )
    expect(qualifiedVisitStorageKey("/rate/a/b", "src=twitter")).toBe(
      "qv:/rate/a/b?src=twitter",
    )
  })

  it("does not re-send after remount when storage already marked", () => {
    const key = qualifiedVisitStorageKey("/discover", "")
    markQualifiedVisitSent(key)

    // Simulate remount: fresh in-memory state, but storage says sent.
    let state = createQualifiedVisitState()
    if (hasQualifiedVisitBeenSent(key)) {
      state = markFired(state)
    }
    state = onVisibilityChange(state, true, 0)
    state = markInteraction(state, "pointermove")
    const t = QUALIFIED_VISIT_DWELL_MS + 100
    state = flushVisibleTime(state, t)

    expect(hasQualifiedVisitBeenSent(key)).toBe(true)
    expect(shouldFireQualifiedVisit(state, t)).toBe(false)
  })

  it("allows first send when storage is empty, then blocks", () => {
    const key = qualifiedVisitStorageKey("/news", "")
    expect(hasQualifiedVisitBeenSent(key)).toBe(false)

    let state = createQualifiedVisitState()
    state = onVisibilityChange(state, true, 0)
    state = markInteraction(state, "scroll")
    const t = QUALIFIED_VISIT_DWELL_MS + 50
    state = flushVisibleTime(state, t)
    expect(shouldFireQualifiedVisit(state, t)).toBe(true)

    state = markFired(state)
    markQualifiedVisitSent(key)

    let remounted = createQualifiedVisitState()
    if (hasQualifiedVisitBeenSent(key)) {
      remounted = markFired(remounted)
    }
    remounted = onVisibilityChange(remounted, true, 0)
    remounted = markInteraction(remounted, "keydown")
    remounted = flushVisibleTime(remounted, t + 20_000)
    expect(shouldFireQualifiedVisit(remounted, t + 20_000)).toBe(false)
  })

  it("fails open when sessionStorage throws", () => {
    Object.defineProperty(globalThis, "sessionStorage", {
      value: {
        getItem: () => {
          throw new Error("blocked")
        },
        setItem: () => {
          throw new Error("blocked")
        },
      },
      configurable: true,
    })
    expect(hasQualifiedVisitBeenSent("qv:/x")).toBe(false)
    expect(() => markQualifiedVisitSent("qv:/x")).not.toThrow()
  })

  it("fails open when sessionStorage is undefined", () => {
    Object.defineProperty(globalThis, "sessionStorage", {
      value: undefined,
      configurable: true,
    })
    expect(hasQualifiedVisitBeenSent("qv:/y")).toBe(false)
    expect(() => markQualifiedVisitSent("qv:/y")).not.toThrow()
  })
})
