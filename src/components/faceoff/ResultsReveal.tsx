"use client"

import Link from "next/link"
import { DISPLAY } from "@/components/faceoff/states"
import type { FaceOffChoiceSummary, FaceOffRankSnippet } from "@/lib/faceoff/types"
import { trackFaceOff } from "@/lib/analytics"

const GOLD = "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)"

export function ResultsReveal({
  heading,
  choices,
  rankings,
  closeContest,
  developing,
  onContinue,
}: {
  heading: string
  choices: FaceOffChoiceSummary[]
  rankings: FaceOffRankSnippet[]
  closeContest: { leftName: string; rightName: string; gap: number } | null
  developing: boolean
  onContinue: () => void
}) {
  return (
    <section className="mx-auto max-w-xl px-4 py-6 sm:px-5 sm:py-10">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#FFD700]/80">Face-Off</p>
      <h2 className="mt-2 text-3xl sm:text-5xl text-white leading-tight" style={DISPLAY}>{heading}</h2>
      <ol className="mt-8 space-y-3">
        {choices.map((choice, index) => (
          <li key={`${choice.winner.id}-${choice.createdAt}-${index}`} className="rounded-md border border-white/10 bg-white/[0.03] px-4 py-3">
            <p className="text-white" style={DISPLAY}>
              {choice.winner.name}
              {choice.winner.filmTitle ? <span className="text-zinc-400"> — {choice.winner.filmTitle}</span> : null}
            </p>
            <p className="mt-1 text-xs text-zinc-500">
              over {choice.loser.name}
              {choice.loser.filmTitle ? ` — ${choice.loser.filmTitle}` : ""}
            </p>
          </li>
        ))}
      </ol>
      <div className="mt-8">
        <h3 className="text-sm uppercase tracking-[0.16em] text-zinc-500">Community rankings</h3>
        {developing ? (
          <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
            Rankings are still developing. A few more comparisons are needed before these standings mean much.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {rankings.map((row) => (
              <li key={row.entityId} className="text-sm text-zinc-300">
                {row.developing || row.rank == null
                  ? `${row.name} — still developing (${row.comparisons} comparisons)`
                  : `${row.name} — rank ${row.rank} after ${row.comparisons} comparisons`}
              </li>
            ))}
          </ul>
        )}
      </div>
      {closeContest ? (
        <p className="mt-6 text-sm text-zinc-300 leading-relaxed">
          A close contest: {closeContest.leftName} and {closeContest.rightName} are separated by {closeContest.gap.toFixed(1)} rating points after enough comparisons to treat the gap as real.
        </p>
      ) : null}
      <div className="mt-8 flex flex-col items-start gap-3">
        <button
          type="button"
          onClick={onContinue}
          className="inline-flex min-h-11 items-center rounded-md px-5 py-2.5 text-sm font-bold text-black"
          style={{ background: GOLD }}
        >
          Keep playing
        </button>
        <Link
          href="/auth/register?callbackUrl=/faceoff"
          onClick={() => trackFaceOff("faceoff_signup_started", { source: "results" }, "signup-results")}
          className="text-sm text-zinc-400 hover:text-[#FFD700]"
        >
          Save your rankings
        </Link>
        <p className="text-xs text-zinc-500">Keep your history across devices with a free account. Playing as a guest still counts.</p>
      </div>
    </section>
  )
}
