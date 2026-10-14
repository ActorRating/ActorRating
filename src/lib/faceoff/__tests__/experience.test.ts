import { resolveFaceOffImage } from "@/lib/faceoff/images"
import { shouldCommitSwipe } from "@/lib/faceoff/gesture"
import {
  blockedPairKeys,
  classifySessionPair,
  canStreamToQueuedMatchup,
  confirmedChoiceCount,
  motionMs,
  revealAfterAcceptedVotes,
  winnerForSide,
} from "@/lib/faceoff/pairs"

const POSTER = "https://image.tmdb.org/t/p/w780/poster.jpg"
const PORTRAIT = "https://image.tmdb.org/t/p/w185/rupert.jpg"
const HOWARD = "https://image.tmdb.org/t/p/h632/bryce.jpg"

describe("face-off image resolution", () => {
  it("uses an actor portrait and never a film poster", () => {
    expect(resolveFaceOffImage({
      type: "actor",
      portraitUrl: PORTRAIT,
      posterUrl: POSTER,
      cachedUrl: POSTER,
    })).toBe("https://image.tmdb.org/t/p/h632/rupert.jpg")
  })

  it("resolves a performance to the linked actor portrait", () => {
    expect(resolveFaceOffImage({
      type: "performance",
      portraitUrl: HOWARD,
      posterUrl: POSTER,
      cachedUrl: POSTER,
    })).toBe(HOWARD)
  })

  it("leaves a missing actor portrait empty instead of using movie art", () => {
    expect(resolveFaceOffImage({
      type: "actor",
      portraitUrl: null,
      posterUrl: POSTER,
      cachedUrl: POSTER,
    })).toBeNull()
  })

  it("falls back to a film poster only for a performance with no portrait", () => {
    expect(resolveFaceOffImage({
      type: "performance",
      portraitUrl: null,
      posterUrl: POSTER,
      cachedUrl: null,
    })).toBe("https://image.tmdb.org/t/p/w342/poster.jpg")
  })

  it("uses a cached poster for a performance when no linked artwork exists", () => {
    expect(resolveFaceOffImage({
      type: "performance",
      portraitUrl: null,
      posterUrl: null,
      cachedUrl: "https://image.tmdb.org/t/p/original/cached.jpg",
    })).toBe("https://image.tmdb.org/t/p/w342/cached.jpg")
  })
})

describe("face-off gestures and votes", () => {
  it("records the left choice as the left id", () => {
    expect(winnerForSide("left", "rupert", "bryce")).toBe("rupert")
  })

  it("records the right choice as the right id", () => {
    expect(winnerForSide("right", "rupert", "bryce")).toBe("bryce")
  })

  it("snaps a short swipe back without a selection", () => {
    expect(shouldCommitSwipe(24, 280)).toBeNull()
    expect(shouldCommitSwipe(-18, 400)).toBeNull()
  })

  it("commits a long swipe or a quick flick", () => {
    expect(shouldCommitSwipe(-90, 300)).toBe("left")
    expect(shouldCommitSwipe(80, 200)).toBe("right")
    expect(shouldCommitSwipe(42, 40)).toBe("right")
  })

  it("does not advance the accepted count when the request fails", () => {
    expect(confirmedChoiceCount(2, false, 3)).toBe(2)
    expect(confirmedChoiceCount(2, false, null)).toBe(2)
    expect(confirmedChoiceCount(2, true, 3)).toBe(3)
  })

  it("drops motion duration when reduced motion is requested", () => {
    expect(motionMs(true, 180)).toBe(0)
    expect(motionMs(false, 180)).toBe(180)
  })

  it("streams to a decoded next pair and holds the fifth vote for the reveal", () => {
    expect(canStreamToQueuedMatchup({
      currentId: "a",
      queuedId: "b",
      imagesReady: true,
      holdForReveal: false,
    })).toBe(true)
    expect(canStreamToQueuedMatchup({
      currentId: "a",
      queuedId: "b",
      imagesReady: false,
      holdForReveal: false,
    })).toBe(false)
    expect(canStreamToQueuedMatchup({
      currentId: "a",
      queuedId: "a",
      imagesReady: true,
      holdForReveal: false,
    })).toBe(false)
    expect(canStreamToQueuedMatchup({
      currentId: "a",
      queuedId: "b",
      imagesReady: true,
      holdForReveal: true,
    })).toBe(false)
  })
})

describe("face-off skip rules", () => {
  const now = Date.parse("2026-10-14T12:00:00Z")
  const later = new Date("2026-10-14T12:20:00Z")

  it("treats a consumed matchup with no vote as a skip", () => {
    expect(classifySessionPair({
      pairKey: "a:b",
      consumedAt: new Date(now),
      expiresAt: later,
      voted: new Set(),
      now,
    })).toBe("skipped")
  })

  it("keeps a skipped pair out while another pair is available", () => {
    const blocked = blockedPairKeys({
      voted: new Set(["a:b"]),
      skipped: new Set(["c:d"]),
      open: new Set(),
    }, false)
    expect(blocked.has("c:d")).toBe(true)
    expect(blocked.has("a:b")).toBe(true)
  })

  it("allows a skipped pair again only after the other pairs are exhausted", () => {
    const relaxed = blockedPairKeys({
      voted: new Set(["a:b"]),
      skipped: new Set(["c:d"]),
      open: new Set(["e:f"]),
    }, true)
    expect(relaxed.has("c:d")).toBe(false)
    expect(relaxed.has("a:b")).toBe(true)
    expect(relaxed.has("e:f")).toBe(true)
  })

  it("does not count a skip toward the five-vote reveal", () => {
    expect(revealAfterAcceptedVotes(4)).toBe(false)
    expect(revealAfterAcceptedVotes(5)).toBe(true)
    expect(revealAfterAcceptedVotes(0)).toBe(false)
  })
})
