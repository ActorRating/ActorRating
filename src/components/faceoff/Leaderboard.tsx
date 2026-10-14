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
  return (
    <section className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#FFD700]/80">Face-Off</p>
          <h1 className="mt-2 text-4xl text-white" style={DISPLAY}>Rankings</h1>
          <p className="mt-2 text-sm text-zinc-500">
            Listed after at least {minimumComparisons} comparisons. Separate pools for actors and performances.
          </p>
        </div>
        <Link href="/faceoff" className="text-sm text-zinc-400 hover:text-[#FFD700] shrink-0">Back to Face-Off</Link>
      </div>
      <div className="mt-6 flex gap-2">
        {(["actor", "performance"] as const).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={type === option}
            onClick={() => void load(option, 1)}
            className={`min-h-10 rounded-md px-3 text-sm font-semibold ${type === option ? "bg-white text-black" : "border border-white/10 text-zinc-300"}`}
          >
            {option === "actor" ? "Actors" : "Performances"}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <p className="mt-10 text-sm text-zinc-400">
          Rankings are still developing. Play a few Face-Offs and this list will fill in from real votes.
        </p>
      ) : (
        <ol className={`mt-6 divide-y divide-white/10 ${loading ? "opacity-60" : ""}`}>
          {rows.map((row) => (
            <li key={row.entity.id} className="flex items-center gap-3 py-3">
              <span className="w-8 text-sm tabular-nums text-zinc-500">{row.rank}</span>
              <div className="relative h-14 w-10 overflow-hidden rounded-sm bg-zinc-900 shrink-0">
                {row.entity.imageUrl ? (
                  <Image src={row.entity.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                {row.entity.href ? (
                  <Link href={row.entity.href} className="text-white hover:text-[#FFD700]" style={DISPLAY}>
                    {row.entity.name}
                  </Link>
                ) : (
                  <p className="text-white" style={DISPLAY}>{row.entity.name}</p>
                )}
                {row.entity.filmTitle ? (
                  <p className="text-xs text-zinc-500 truncate">{row.entity.filmTitle}{row.entity.year ? ` · ${row.entity.year}` : ""}</p>
                ) : null}
              </div>
              <span className="text-xs text-zinc-500 tabular-nums">{row.comparisons}</span>
            </li>
          ))}
        </ol>
      )}
      {pages > 1 ? (
        <div className="mt-6 flex items-center justify-between text-sm text-zinc-400">
          <button type="button" disabled={page <= 1 || loading} onClick={() => void load(type, page - 1)} className="disabled:opacity-40">Previous</button>
          <span>{page} / {pages}</span>
          <button type="button" disabled={page >= pages || loading} onClick={() => void load(type, page + 1)} className="disabled:opacity-40">Next</button>
        </div>
      ) : null}
    </section>
  )
}
