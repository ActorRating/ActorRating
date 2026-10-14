"use client"

import Image from "next/image"
import Link from "next/link"
import { useState } from "react"
import { DISPLAY } from "@/components/faceoff/states"
import type { FaceOffPublicEntity } from "@/lib/faceoff/types"

type Row = {
  rank: number
  comparisons: number
  entity: FaceOffPublicEntity
}

const GOLD = "linear-gradient(135deg, #FFE55C 0%, #FFD700 40%, #FFA500 85%, #FF8C00 100%)"

function Portrait({ entity, large = false }: { entity: FaceOffPublicEntity; large?: boolean }) {
  const initial = entity.name.trim().slice(0, 1).toUpperCase()
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-md border border-white/10 bg-zinc-950 ${large ? "h-20 w-16" : "h-14 w-11"}`}>
      {entity.imageUrl ? (
        <Image src={entity.imageUrl} alt="" fill sizes={large ? "64px" : "44px"} className="object-cover object-top" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center text-xl text-[#FFE9A0]" style={DISPLAY}>{initial}</span>
      )}
    </div>
  )
}

export function Leaderboard({
  initialType,
  initialRows,
  initialTotal,
  minimumComparisons,
}: {
  initialType: "actor" | "performance"
  initialRows: Row[]
  initialTotal: number
  minimumComparisons: number
}) {
  const [type, setType] = useState(initialType)
  const [rows, setRows] = useState(initialRows)
  const [total, setTotal] = useState(initialTotal)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(false)

  async function load(nextType: "actor" | "performance", nextPage: number) {
    setLoading(true)
    try {
      const res = await fetch(`/api/faceoff/leaderboard?type=${nextType}&page=${nextPage}`)
      if (!res.ok) return
      const data = await res.json()
      setType(nextType)
      setPage(nextPage)
      setRows(data.rows ?? [])
      setTotal(data.total ?? 0)
    } finally {
      setLoading(false)
    }
  }

  const pages = Math.max(1, Math.ceil(total / 20))
  const featured = rows.slice(0, 3)
  const rest = rows.slice(3)

  return (
    <section className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6 sm:pt-10">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[#FFD700]/80">Face-Off</p>
      <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-4xl text-white sm:text-6xl" style={DISPLAY}>The board</h1>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-zinc-400">
            Who the community keeps choosing. A name lands here after {minimumComparisons} real comparisons.
          </p>
        </div>
        <Link
          href="/faceoff"
          className="inline-flex min-h-12 items-center justify-center rounded-md px-5 text-sm font-bold text-black"
          style={{ background: GOLD }}
        >
          Keep playing
        </Link>
      </div>

      <div className="mt-6 flex gap-2" role="group" aria-label="Ranking pool">
        {(["actor", "performance"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={type === option}
            onClick={() => void load(option, 1)}
            className={`min-h-10 rounded-md px-3 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFD700] ${
              type === option ? "bg-white text-black" : "border border-white/10 text-zinc-300 hover:text-white"
            }`}
          >
            {option === "actor" ? "Actors" : "Performances"}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="mt-8 overflow-hidden rounded-lg border border-[#FFD700]/25 bg-[radial-gradient(circle_at_top,rgba(255,196,60,0.16),transparent_55%),#090909] px-5 py-10 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#FFD700]/80">Still open</p>
          <h2 className="mt-2 text-4xl text-white" style={DISPLAY}>No one owns this list yet.</h2>
          <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-zinc-300">
            {minimumComparisons} comparisons and a portrait takes a place. Play a round and start the board.
          </p>
          <Link
            href="/faceoff"
            className="mt-6 inline-flex min-h-12 items-center justify-center rounded-md px-6 text-sm font-bold text-black"
            style={{ background: GOLD }}
          >
            Play Face-Off
          </Link>
        </div>
      ) : (
        <div className={loading ? "opacity-60" : ""}>
          <ol className="mt-6 grid gap-3 sm:grid-cols-3">
            {featured.map((row) => (
              <li key={row.entity.id} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl text-[#FFD700]" style={DISPLAY}>{row.rank}</span>
                  <Portrait entity={row.entity} large />
                  <div className="min-w-0">
                    <p className="truncate text-xl leading-tight text-white" style={DISPLAY}>{row.entity.name}</p>
                    <p className="truncate text-[11px] text-zinc-500">
                      {row.entity.filmTitle ? `${row.entity.filmTitle}${row.entity.year ? ` · ${row.entity.year}` : ""}` : `${row.comparisons} comparisons`}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          {rest.length > 0 ? (
            <ol className="mt-4 divide-y divide-white/10">
              {rest.map((row) => (
                <li key={row.entity.id} className="flex items-center gap-3 py-3">
                  <span className="w-8 text-sm tabular-nums text-zinc-500">{row.rank}</span>
                  <Portrait entity={row.entity} />
                  <div className="min-w-0 flex-1">
                    {row.entity.href ? (
                      <Link href={row.entity.href} className="text-white hover:text-[#FFD700]" style={DISPLAY}>
                        {row.entity.name}
                      </Link>
                    ) : (
                      <p className="text-white" style={DISPLAY}>{row.entity.name}</p>
                    )}
                    {row.entity.filmTitle ? (
                      <p className="truncate text-xs text-zinc-500">{row.entity.filmTitle}{row.entity.year ? ` · ${row.entity.year}` : ""}</p>
                    ) : null}
                  </div>
                  <span className="text-xs tabular-nums text-zinc-500">{row.comparisons}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      )}

      {pages > 1 ? (
        <div className="mt-6 flex items-center justify-between text-sm text-zinc-400">
          <button type="button" disabled={page <= 1 || loading} onClick={() => void load(type, page - 1)} className="min-h-11 px-2 disabled:opacity-40">Previous</button>
          <span>{page} / {pages}</span>
          <button type="button" disabled={page >= pages || loading} onClick={() => void load(type, page + 1)} className="min-h-11 px-2 disabled:opacity-40">Next</button>
        </div>
      ) : null}
    </section>
  )
}
