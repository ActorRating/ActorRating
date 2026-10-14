"use client"

import Image from "next/image"
import Link from "next/link"
import { DISPLAY } from "@/components/faceoff/states"
import type { FaceOffChoiceSummary, FaceOffRankSnippet } from "@/lib/faceoff/types"
import { trackFaceOff } from "@/lib/analytics"

const GOLD = "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)"

function Portrait({ src, name }: { src: string | null; name: string }) {
  const initial = name.trim().slice(0, 1).toUpperCase()
  return (
    <div className="relative h-14 w-11 shrink-0 overflow-hidden rounded-md border border-white/10 bg-zinc-950">
      {src ? (
        <Image src={src} alt="" fill sizes="44px" className="object-cover object-top" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-lg text-[#FFE9A0]" style={DISPLAY}>{initial}</span>
      )}
    </div>
  )
}

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
  const ordered = [...choices].reverse()
  return (
    <section className="mx-auto max-w-lg px-4 py-5 sm:px-5 sm:py-8">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[#FFD700]/80">Five down</p>
      <h2 className="mt-1 text-4xl leading-none text-white sm:text-5xl" style={DISPLAY}>{heading}</h2>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-zinc-400">
        These counted. The next pair is waiting.
      </p>

      <button
        type="button"
        onClick={onContinue}
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-md px-5 text-sm font-bold tracking-wide text-black"
        style={{ background: GOLD }}
      >
        Keep playing
      </button>

      <ol className="mt-5 space-y-2">
        {ordered.map((choice, index) => (
          <li
            key={`${choice.winner.id}-${choice.createdAt}-${index}`}
            className="flex items-center gap-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2.5"
          >
            <span className="w-4 text-xs tabular-nums text-[#FFD700]/80">{index + 1}</span>
            <Portrait src={choice.winner.imageUrl} name={choice.winner.name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg leading-tight text-white" style={DISPLAY}>{choice.winner.name}</p>
              <p className="truncate text-[11px] text-zinc-500">
                over {choice.loser.name}
                {choice.winner.filmTitle ? ` · ${choice.winner.filmTitle}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-6 rounded-md border border-[#FFD700]/20 bg-[radial-gradient(circle_at_top,rgba(255,215,0,0.08),transparent_60%)] px-4 py-4">
        <h3 className="text-[11px] uppercase tracking-[0.18em] text-[#FFD700]/80">On the board</h3>
        {developing ? (
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            The public board is still forming. A few more Face-Offs and these names start to place.
          </p>
        ) : (
          <ul className="mt-3 space-y-1.5">
            {rankings.map((row) => (
              <li key={row.entityId} className="text-sm text-zinc-200">
                {row.developing || row.rank == null
                  ? `${row.name} is still climbing`
                  : `${row.name} is rank ${row.rank}`}
              </li>
            ))}
          </ul>
        )}
        {closeContest ? (
          <p className="mt-3 text-sm text-zinc-300">
            {closeContest.leftName} and {closeContest.rightName} are close on the board.
          </p>
        ) : null}
        <Link href="/faceoff/leaderboard" className="mt-3 inline-flex text-sm font-semibold text-[#FFE27A] hover:text-white">
          Open the rankings
        </Link>
      </div>

      <Link
        href="/auth/register?callbackUrl=/faceoff"
        onClick={() => trackFaceOff("faceoff_signup_started", { source: "results" }, "signup-results")}
        className="mt-4 inline-flex text-sm text-zinc-500 hover:text-[#FFD700]"
      >
        Save this run with a free account
      </Link>
    </section>
  )
}
