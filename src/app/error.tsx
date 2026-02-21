"use client"

import { useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/Button"

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("Route error:", error)
    }
  }, [error])

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <div className="mx-auto h-12 w-12 rounded-full bg-primary/15 flex items-center justify-center">
          <span className="text-xl">⚠️</span>
        </div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-dm-serif-display)" }}>
          Something went wrong
        </h1>
        <p className="text-sm text-muted-foreground">
          We couldn’t load this page. Please try again.
          {process.env.NODE_ENV === "development" && error?.digest ? ` (Ref: ${error.digest})` : null}
          {process.env.NODE_ENV === "production" && error?.digest ? (
            <span className="block mt-2 text-xs">Ref: {error.digest}. If you run this site: set DATABASE_URL to your Supabase Postgres connection string (pooler port 6543).</span>
          ) : null}
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" onClick={reset}>
            Try again
          </Button>
          <Link href="/">
            <Button>Go home</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
