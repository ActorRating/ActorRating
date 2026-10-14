"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { FaceOffHeader } from "@/components/faceoff/FaceOffHeader"
import { MatchupCard } from "@/components/faceoff/MatchupCard"
import { ResultsReveal } from "@/components/faceoff/ResultsReveal"
import { ShareButton } from "@/components/faceoff/ShareButton"
import { SwipeControls } from "@/components/faceoff/SwipeControls"
import { EmptyState, ErrorState, LoadingState } from "@/components/faceoff/states"
import { trackFaceOff } from "@/lib/analytics"
import type { FaceOffModeName } from "@/lib/faceoff/constants"
import type { FaceOffChoiceSummary, FaceOffPublicMatchup, FaceOffRankSnippet } from "@/lib/faceoff/types"

type Status = "loading" | "ready" | "submitting" | "reveal" | "error" | "empty"

type ResultsPayload = {
  heading: string
  choices: FaceOffChoiceSummary[]
  rankings: FaceOffRankSnippet[]
  closeContest: { leftName: string; rightName: string; gap: number } | null
  developing: boolean
}

const SWIPE_THRESHOLD = 88

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
  const [notice, setNotice] = useState<string | null>(null)
  const [results, setResults] = useState<ResultsPayload | null>(null)
  const [drag, setDrag] = useState(0)
  const reduceMotion = usePrefersReducedMotion()
  const requestId = useRef(0)
  const prefetch = useRef<FaceOffPublicMatchup | null>(null)
  const touch = useRef<{ x: number; y: number; horizontal: boolean } | null>(null)
  const voting = useRef(false)

  const applyMatchup = useCallback((next: FaceOffPublicMatchup | null, empty?: string | null) => {
    if (!next) {
      setMatchup(null)
      setMessage(empty || "No matchup is available.")
      setStatus("empty")
      return
    }
    setMatchup(next)
    setStatus("ready")
    trackFaceOff(
      "faceoff_matchup_viewed",
      { mode: next.mode, auth: "guest" },
      `view:${next.id}`,
    )
  }, [])

  const loadNext = useCallback(async (nextMode: FaceOffModeName, share?: string | null) => {
    const id = ++requestId.current
    setStatus("loading")
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
      applyMatchup(data.matchup ?? null, data.empty)
    } catch {
      if (id !== requestId.current) return
      setMessage("The connection dropped. Your last confirmed choice is unchanged.")
      setStatus("error")
    }
  }, [applyMatchup])

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
        if (data.matchup && data.matchup.id !== currentId) prefetch.current = data.matchup
      })
      .catch(() => {})
    return () => controller.abort()
  }, [status, matchup, mode])

  const choose = useCallback(async (side: "left" | "right") => {
    if (!matchup || status !== "ready" || voting.current) return
    voting.current = true
    setStatus("submitting")
    setDrag(0)
    const winnerId = side === "left" ? matchup.left.id : matchup.right.id
    trackFaceOff("faceoff_vote_submitted", { mode: matchup.mode, choice_number: choiceCount + 1 }, `submit:${matchup.id}`)
    try {
      const res = await fetch("/api/faceoff/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ matchupId: matchup.id, winnerId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setMessage(data.error || "That vote was not accepted.")
        if (res.status === 409) {
          prefetch.current = null
          voting.current = false
          await loadNext(mode)
          return
        }
        setStatus("ready")
        voting.current = false
        return
      }
      setChoiceCount(data.choiceCount ?? choiceCount)
      if (data.reveal) {
        const resultsRes = await fetch("/api/faceoff/results", { credentials: "same-origin" })
        const payload = resultsRes.ok ? await resultsRes.json() : null
        if (payload?.choices) {
          setResults(payload)
          setStatus("reveal")
          trackFaceOff("faceoff_results_viewed", { choice_number: data.choiceCount }, `results:${data.choiceCount}`)
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
      await loadNext(mode)
    } catch {
      setMessage("The vote did not go through. You can try this matchup again.")
      setStatus("ready")
      voting.current = false
    }
  }, [applyMatchup, choiceCount, loadNext, matchup, mode, status])

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
    touch.current = { x: point.clientX, y: point.clientY, horizontal: false }
  }
  function onTouchMove(event: React.TouchEvent) {
    if (!touch.current || status !== "ready") return
    const point = event.changedTouches[0]
    const dx = point.clientX - touch.current.x
    const dy = point.clientY - touch.current.y
    if (!touch.current.horizontal) {
      if (Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
        touch.current = null
        setDrag(0)
        return
      }
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.25) {
        touch.current.horizontal = true
      }
    }
    if (touch.current?.horizontal && !reduceMotion) setDrag(dx)
  }
  function onTouchEnd(event: React.TouchEvent) {
    const origin = touch.current
    if (!origin?.horizontal) {
      touch.current = null
      setDrag(0)
      return
    }
    const point = event.changedTouches[0]
    const dx = point ? point.clientX - origin.x : 0
    touch.current = null
    setDrag(0)
    if (Math.abs(dx) < SWIPE_THRESHOLD) return
    void choose(dx < 0 ? "left" : "right")
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

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <FaceOffHeader mode={mode} choiceCount={choiceCount} disabled={status === "submitting"} onMode={(next) => void onMode(next)} />
      <main className="mx-auto flex w-full max-w-5xl flex-col px-4 pt-4 sm:px-6 sm:pt-8">
        {notice ? <p className="mb-4 text-center text-sm text-zinc-400">{notice}</p> : null}
        {status === "loading" || status === "submitting" && !matchup ? <LoadingState /> : null}
        {status === "error" ? <ErrorState message={message} onRetry={() => void loadNext(mode)} /> : null}
        {status === "empty" ? <EmptyState message={message} onSwitch={() => void onMode("mixed")} /> : null}
        {status === "reveal" && results ? (
          <ResultsReveal
            {...results}
            onContinue={() => {
              trackFaceOff("faceoff_continued", { choice_number: choiceCount }, `continue:${choiceCount}`)
              setResults(null)
              const queued = prefetch.current
              prefetch.current = null
              if (queued) applyMatchup(queued)
              else void loadNext(mode)
            }}
          />
        ) : null}
        {matchup && (status === "ready" || status === "submitting") ? (
          <div className="flex flex-col gap-4">
            <div
              className="relative grid grid-cols-2 items-start gap-3 sm:gap-10"
              style={{ touchAction: "pan-y" }}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onTouchCancel={() => {
                touch.current = null
                setDrag(0)
              }}
            >
              <MatchupCard
                entity={matchup.left}
                disabled={status !== "ready"}
                offsetX={drag < 0 ? drag * 0.35 : 0}
                onChoose={() => void choose("left")}
              />
              <div className="pointer-events-none absolute left-1/2 top-[38%] -translate-x-1/2 -translate-y-1/2 text-xs sm:text-sm tracking-[0.2em] text-[#FFD700]">
                VS
              </div>
              <MatchupCard
                entity={matchup.right}
                disabled={status !== "ready"}
                offsetX={drag > 0 ? drag * 0.35 : 0}
                onChoose={() => void choose("right")}
              />
            </div>
            <p className="text-center text-[11px] text-zinc-500">
              {status === "submitting"
                ? "Recording your choice"
                : "Swipe left for the left choice, swipe right for the right choice. A short swipe snaps back."}
            </p>
            <SwipeControls
              leftName={matchup.left.name}
              rightName={matchup.right.name}
              disabled={status !== "ready"}
              onLeft={() => void choose("left")}
              onRight={() => void choose("right")}
            />
            <div className="flex items-center justify-center gap-4 pb-6">
              <ShareButton leftId={matchup.left.id} rightId={matchup.right.id} disabled={status !== "ready"} />
              <Link href="/faceoff/leaderboard" className="text-sm text-zinc-500 hover:text-[#FFD700] md:hidden">
                Rankings
              </Link>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  )
}
