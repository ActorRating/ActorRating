"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { FaceOffHeader } from "@/components/faceoff/FaceOffHeader"
import { MatchupCard } from "@/components/faceoff/MatchupCard"
import { ResultsReveal } from "@/components/faceoff/ResultsReveal"
import { ShareButton } from "@/components/faceoff/ShareButton"
import { SwipeControls } from "@/components/faceoff/SwipeControls"
import { EmptyState, ErrorState, LoadingState } from "@/components/faceoff/states"
import { trackFaceOff } from "@/lib/analytics"
import type { FaceOffModeName } from "@/lib/faceoff/constants"
import { shouldCommitSwipe } from "@/lib/faceoff/gesture"
import { confirmedChoiceCount, motionMs, winnerForSide } from "@/lib/faceoff/pairs"
import type { FaceOffChoiceSummary, FaceOffPublicMatchup, FaceOffRankSnippet } from "@/lib/faceoff/types"

type Status = "loading" | "ready" | "submitting" | "reveal" | "error" | "empty"

type ResultsPayload = {
  heading: string
  choices: FaceOffChoiceSummary[]
  rankings: FaceOffRankSnippet[]
  closeContest: { leftName: string; rightName: string; gap: number } | null
  developing: boolean
}

const HINT_KEY = "ar-faceoff-swipe-hint"

function usePrefersReducedMotion() {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const apply = () => setReduce(media.matches)
    apply()
    media.addEventListener("change", apply)
    return () => media.removeEventListener("change", apply)
  }, [])
  return reduce
}

function warmImages(matchup: FaceOffPublicMatchup | null) {
  if (!matchup || typeof window === "undefined") return
  for (const url of [matchup.left.imageUrl, matchup.right.imageUrl]) {
    if (!url) continue
    const image = new window.Image()
    image.src = url
  }
}

export function FaceOffExperience({
  shareId = null,
}: {
  shareId?: string | null
}) {
  const [status, setStatus] = useState<Status>("loading")
  const [mode, setMode] = useState<FaceOffModeName>("mixed")
  const [choiceCount, setChoiceCount] = useState(0)
  const [matchup, setMatchup] = useState<FaceOffPublicMatchup | null>(null)
  const [message, setMessage] = useState("Could not load Face-Off.")
  const [banner, setBanner] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [results, setResults] = useState<ResultsPayload | null>(null)
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [picked, setPicked] = useState<"left" | "right" | null>(null)
  const [showHint, setShowHint] = useState(false)
  const reduceMotion = usePrefersReducedMotion()
  const requestId = useRef(0)
  const prefetch = useRef<FaceOffPublicMatchup | null>(null)
  const touch = useRef<{ x: number; y: number; at: number; horizontal: boolean } | null>(null)
  const voting = useRef(false)
  const suppressClick = useRef(false)

  const applyMatchup = useCallback((next: FaceOffPublicMatchup | null, empty?: string | null) => {
    setPicked(null)
    setDrag(0)
    setDragging(false)
    if (!next) {
      setMatchup(null)
      setMessage(empty || "No matchup is available.")
      setStatus("empty")
      return
    }
    setMatchup(next)
    setStatus("ready")
    setBanner(null)
    trackFaceOff("faceoff_matchup_viewed", { mode: next.mode, auth: "guest" }, `view:${next.id}`)
  }, [])

  const loadNext = useCallback(async (
    nextMode: FaceOffModeName,
    share?: string | null,
    options?: { silent?: boolean },
  ) => {
    const id = ++requestId.current
    if (!options?.silent) {
      setMatchup(null)
      setStatus("loading")
    }
    prefetch.current = null
    const params = new URLSearchParams({ mode: nextMode })
    if (share) params.set("share", share)
    try {
      const res = await fetch(`/api/faceoff/next?${params.toString()}`, { credentials: "same-origin" })
      const data = await res.json().catch(() => ({}))
      if (id !== requestId.current) return
      if (!res.ok) {
        setMessage(data.error || "Could not load a matchup.")
        setStatus("error")
        return
      }
      if (typeof data.choiceCount === "number") setChoiceCount(data.choiceCount)
      if (data.mode === "actor" || data.mode === "performance" || data.mode === "mixed") {
        setMode(data.mode)
      }
      if (!data.matchup && share) {
        setNotice("That shared matchup is no longer available. Here is another.")
        await loadNext(nextMode)
        return
      }
      warmImages(data.matchup ?? null)
      applyMatchup(data.matchup ?? null, data.empty)
    } catch {
      if (id !== requestId.current) return
      setMessage("The connection dropped. Your last confirmed choice is unchanged.")
      setStatus("error")
    }
  }, [applyMatchup])

  useEffect(() => {
    try {
      setShowHint(window.sessionStorage.getItem(HINT_KEY) !== "1")
    } catch {
      setShowHint(true)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch("/api/faceoff/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({}),
        })
        const data = await res.json().catch(() => ({}))
        if (cancelled) return
        if (!res.ok) {
          setMessage(data.error || "Face-Off is not available.")
          setStatus(res.status === 404 ? "empty" : "error")
          return
        }
        if (typeof data.choiceCount === "number") setChoiceCount(data.choiceCount)
        if (data.mode === "actor" || data.mode === "performance" || data.mode === "mixed") setMode(data.mode)
        trackFaceOff("faceoff_started", { mode: data.mode, auth: data.auth, source: shareId ? "share" : "direct" }, "started")
        if (data.resumed) trackFaceOff("faceoff_returned", { auth: data.auth }, "returned")
        if (data.justLinked) {
          trackFaceOff("faceoff_signup_completed", { auth: "authenticated" }, "linked")
        }
        await loadNext(data.mode || "mixed", shareId)
      } catch {
        if (!cancelled) {
          setMessage("Could not start Face-Off.")
          setStatus("error")
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadNext, shareId])

  useEffect(() => {
    if (status !== "ready" || !matchup || prefetch.current) return
    const currentId = matchup.id
    const controller = new AbortController()
    const params = new URLSearchParams({ mode })
    void fetch(`/api/faceoff/next?${params.toString()}`, { credentials: "same-origin", signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) return
        const data = await res.json()
        if (data.matchup && data.matchup.id !== currentId) {
          prefetch.current = data.matchup
          warmImages(data.matchup)
        }
      })
      .catch(() => {})
    return () => controller.abort()
  }, [status, matchup, mode])

  const dismissHint = useCallback(() => {
    setShowHint(false)
    try {
      window.sessionStorage.setItem(HINT_KEY, "1")
    } catch {
      /* private mode */
    }
  }, [])

  const choose = useCallback(async (side: "left" | "right") => {
    if (!matchup || status !== "ready" || voting.current) return
    voting.current = true
    setPicked(side)
    setDrag(0)
    setDragging(false)
    setStatus("submitting")
    setBanner(null)
    dismissHint()
    const winnerId = winnerForSide(side, matchup.left.id, matchup.right.id)
    trackFaceOff("faceoff_vote_submitted", { mode: matchup.mode, choice_number: choiceCount + 1 }, `submit:${matchup.id}`)
    try {
      const res = await fetch("/api/faceoff/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ matchupId: matchup.id, winnerId }),
      })
      const data = await res.json().catch(() => ({}))
      const nextCount = confirmedChoiceCount(choiceCount, res.ok, data.choiceCount)
      if (!res.ok) {
        setChoiceCount(nextCount)
        setPicked(null)
        setBanner(data.error || "That vote was not accepted.")
        voting.current = false
        if (res.status === 409) {
          prefetch.current = null
          await loadNext(mode, null, { silent: true })
          return
        }
        setStatus("ready")
        return
      }
      setChoiceCount(nextCount)
      if (data.reveal) {
        const resultsRes = await fetch("/api/faceoff/results", { credentials: "same-origin" })
        const payload = resultsRes.ok ? await resultsRes.json() : null
        if (payload?.choices) {
          setResults(payload)
          setStatus("reveal")
          trackFaceOff("faceoff_results_viewed", { choice_number: nextCount }, `results:${nextCount}`)
          voting.current = false
          return
        }
      }
      const queued = prefetch.current
      prefetch.current = null
      voting.current = false
      if (queued && queued.id !== matchup.id) {
        applyMatchup(queued)
        return
      }
      await loadNext(mode, null, { silent: true })
    } catch {
      setPicked(null)
      setBanner("The vote did not go through. You can try this matchup again.")
      setStatus("ready")
      voting.current = false
    }
  }, [applyMatchup, choiceCount, dismissHint, loadNext, matchup, mode, status])

  const skip = useCallback(async () => {
    if (!matchup || status !== "ready" || voting.current) return
    voting.current = true
    setStatus("submitting")
    setBanner(null)
    setDrag(0)
    dismissHint()
    try {
      const res = await fetch("/api/faceoff/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ matchupId: matchup.id }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setBanner(data.error || "Could not skip that matchup.")
        setStatus("ready")
        voting.current = false
        return
      }
      prefetch.current = null
      voting.current = false
      if (data.mode === "actor" || data.mode === "performance" || data.mode === "mixed") setMode(data.mode)
      warmImages(data.matchup ?? null)
      applyMatchup(data.matchup ?? null, data.empty)
    } catch {
      setBanner("Skip did not go through. This matchup is unchanged.")
      setStatus("ready")
      voting.current = false
    }
  }, [applyMatchup, dismissHint, matchup, status])

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (status !== "ready") return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return
      if (event.key === "ArrowLeft") {
        event.preventDefault()
        void choose("left")
      }
      if (event.key === "ArrowRight") {
        event.preventDefault()
        void choose("right")
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [choose, status])

  function onTouchStart(event: React.TouchEvent) {
    if (status !== "ready") return
    const point = event.changedTouches[0]
    touch.current = { x: point.clientX, y: point.clientY, at: performance.now(), horizontal: false }
  }
  function onTouchMove(event: React.TouchEvent) {
    const origin = touch.current
    if (!origin || status !== "ready") return
    const point = event.changedTouches[0]
    const dx = point.clientX - origin.x
    const dy = point.clientY - origin.y
    if (!origin.horizontal) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        touch.current = null
        setDrag(0)
        setDragging(false)
        return
      }
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        origin.horizontal = true
        setDragging(true)
      }
    }
    if (origin.horizontal) setDrag(Math.max(-110, Math.min(110, dx)))
  }
  function onTouchEnd(event: React.TouchEvent) {
    const origin = touch.current
    touch.current = null
    setDragging(false)
    if (!origin?.horizontal) {
      setDrag(0)
      return
    }
    const point = event.changedTouches[0]
    const dx = point ? point.clientX - origin.x : 0
    if (Math.abs(dx) > 10) suppressClick.current = true
    const side = shouldCommitSwipe(dx, performance.now() - origin.at)
    setDrag(0)
    if (!side) return
    void choose(side)
  }

  function onCardChoose(side: "left" | "right") {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    void choose(side)
  }

  async function onMode(next: FaceOffModeName) {
    if (next === mode || status === "submitting") return
    setNotice(null)
    prefetch.current = null
    await fetch("/api/faceoff/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ mode: next }),
    })
    await loadNext(next)
  }

  const stageVisible = Boolean(matchup) && status !== "reveal" && status !== "error" && status !== "empty"
  const snapMs = motionMs(reduceMotion, dragging ? 0 : 180)

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-black text-white">
      <FaceOffHeader mode={mode} choiceCount={choiceCount} disabled={status === "submitting"} onMode={(next) => void onMode(next)} />
      <div className="flex min-h-0 flex-1 flex-col">
        {notice ? <p className="px-4 pt-2 text-center text-xs text-zinc-400">{notice}</p> : null}
        {banner && stageVisible ? (
          <p className="px-4 pt-2 text-center text-xs text-zinc-300" role="alert">{banner}</p>
        ) : null}
        {status === "reveal" && results ? (
          <div className="min-h-0 flex-1 overflow-y-auto">
            <ResultsReveal
              {...results}
              onContinue={() => {
                trackFaceOff("faceoff_continued", { choice_number: choiceCount }, `continue:${choiceCount}`)
                setResults(null)
                const queued = prefetch.current
                prefetch.current = null
                if (queued) applyMatchup(queued)
                else void loadNext(mode, null, { silent: true })
              }}
            />
          </div>
        ) : null}
        {status === "loading" && !matchup ? (
          <div className="flex flex-1 items-center px-3">
            <LoadingState />
          </div>
        ) : null}
        {status === "error" ? (
          <ErrorState message={message} onRetry={() => void loadNext(mode)} />
        ) : null}
        {status === "empty" ? (
          <EmptyState message={message} onSwitch={() => void onMode("mixed")} />
        ) : null}
        {stageVisible && matchup ? (
          <div className="flex min-h-0 flex-1 flex-col justify-center px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
            <div className="flex items-center justify-center">
                <motion.div
                  key={matchup.id}
                  className="w-full"
                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: motionMs(reduceMotion, 140) / 1000, ease: "easeOut" }}
                >
                  <div
                    className="mx-auto grid w-full max-w-[460px] grid-cols-[minmax(0,1fr)_1.75rem_minmax(0,1fr)] items-start sm:max-w-[520px]"
                    style={{
                      transform: drag ? `translate3d(${drag}px,0,0)` : undefined,
                      transition: `transform ${snapMs}ms cubic-bezier(.2,.8,.2,1)`,
                      touchAction: "pan-y",
                    }}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                    onTouchCancel={() => {
                      touch.current = null
                      setDrag(0)
                      setDragging(false)
                    }}
                  >
                    <MatchupCard
                      entity={matchup.left}
                      disabled={status !== "ready"}
                      priority
                      emphasis={picked === "left" ? "chosen" : picked === "right" ? "dim" : "idle"}
                      onChoose={() => onCardChoose("left")}
                    />
                    <div className="pointer-events-none pt-[18%] text-center text-[10px] tracking-[0.22em] text-[#FFD700]/70" aria-hidden>
                      VS
                    </div>
                    <MatchupCard
                      entity={matchup.right}
                      disabled={status !== "ready"}
                      priority
                      emphasis={picked === "right" ? "chosen" : picked === "left" ? "dim" : "idle"}
                      onChoose={() => onCardChoose("right")}
                    />
                  </div>
                </motion.div>
            </div>
            <div className="pt-3">
              {showHint ? (
                <p className="mb-1 text-center text-[11px] tracking-wide text-zinc-500">Swipe to choose</p>
              ) : null}
              <SwipeControls
                leftName={matchup.left.name}
                rightName={matchup.right.name}
                disabled={status !== "ready"}
                onLeft={() => onCardChoose("left")}
                onRight={() => onCardChoose("right")}
                onSkip={() => void skip()}
              />
              <div className="mt-0.5 flex items-center justify-center gap-4 pb-1">
                <ShareButton leftId={matchup.left.id} rightId={matchup.right.id} disabled={status !== "ready"} />
                <Link href="/faceoff/leaderboard" className="text-xs text-zinc-500 hover:text-[#FFD700] md:hidden">
                  Rankings
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
