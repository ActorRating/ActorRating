"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error for debugging/monitoring
    // eslint-disable-next-line no-console
    console.error("/dashboard error:", error)
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center">
          <span className="text-xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-dm-serif-display)' }}>
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground">
          We couldn’t load your dashboard. {error?.message || "Please try again."}
          {error?.digest ? ` (Ref: ${error.digest})` : null}
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" onClick={reset}>Try again</Button>
          <Link href="/">
            <Button>Go home</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}


