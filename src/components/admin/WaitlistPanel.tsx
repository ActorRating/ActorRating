"use client"

import { useState } from "react"
import { formatAdminDateTime, formatRelativeTime } from "@/lib/admin/time"

export type WaitlistRow = {
  id: string
  email: string
  source: string | null
  createdAt: Date | string
}

function toDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value)
}

export default function WaitlistPanel({
  entries,
  totalCount,
}: {
  entries: WaitlistRow[]
  totalCount: number
}) {
  return (
    <section className="mt-6 rounded-2xl border border-border/70 bg-secondary/30 p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-foreground">Waitlist</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalCount} {totalCount === 1 ? "email" : "emails"} waiting for an invite. Copy an
          address, then send a link from your profile invites (
          <code className="text-xs">/auth/register?code=CRAFT-XXXX</code>).
        </p>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">No waitlist signups yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="min-w-full text-sm">
            <thead className="bg-background/60 text-left text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Copy</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((row) => {
                const createdAt = toDate(row.createdAt)
                return (
                  <tr key={row.id} className="border-t border-border/50">
                    <td className="px-4 py-3 font-medium text-foreground break-all">
                      {row.email}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      <span title={formatAdminDateTime(createdAt)}>
                        {formatRelativeTime(createdAt)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.source ?? "—"}</td>
                    <td className="px-4 py-3">
                      <CopyEmailButton email={row.email} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(email)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-background"
    >
      {copied ? "Copied" : "Copy"}
    </button>
  )
}
