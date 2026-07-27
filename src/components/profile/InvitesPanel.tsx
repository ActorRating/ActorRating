"use client"

import { useCallback, useEffect, useState } from "react"
import { Button } from "@/components/ui/Button"
import { Copy, Check } from "lucide-react"

type InviteRow = {
  id: string
  code: string
  used: boolean
  usedAt: string | null
  usedByUsername: string | null
  shareUrl: string
}

export function InvitesPanel() {
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState<string | null>(null)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const res = await fetch("/api/invites/mine")
      if (!res.ok) {
        setError("Could not load invites")
        setInvites([])
        return
      }
      const data = (await res.json()) as { invites?: InviteRow[] }
      setInvites(data.invites ?? [])
    } catch {
      setError("Could not load invites")
      setInvites([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const copy = async (row: InviteRow) => {
    try {
      await navigator.clipboard.writeText(row.shareUrl)
      setCopied(row.id)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setError("Could not copy link")
    }
  }

  return (
    <section className="rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Your invites</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Share unused codes with friends. Each code works once.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}

      <ul className="mt-4 space-y-2">
        {loading ? (
          <li className="text-sm text-muted-foreground">Loading…</li>
        ) : invites.length === 0 ? (
          <li className="text-sm text-muted-foreground">No invite codes yet.</li>
        ) : (
          invites.map((row) => (
            <li
              key={row.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5"
            >
              <div className="min-w-0">
                <div className="font-mono text-sm font-semibold tracking-wide text-foreground">
                  {row.code}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {row.used
                    ? `Used${row.usedByUsername ? ` by @${row.usedByUsername}` : ""}`
                    : "Available"}
                </div>
              </div>
              {!row.used ? (
                <Button type="button" size="sm" variant="outline" onClick={() => void copy(row)}>
                  {copied === row.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1" /> Copy link
                    </>
                  )}
                </Button>
              ) : null}
            </li>
          ))
        )}
      </ul>
    </section>
  )
}
