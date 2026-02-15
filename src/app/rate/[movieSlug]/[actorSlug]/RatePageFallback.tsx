"use client"

import Link from "next/link"
import { Button } from "@/components/ui/Button"

/** Shown when the rate page fails to load data (e.g. DB unavailable). Avoids throwing so we don't 500. */
export default function RatePageFallback() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center space-y-4">
        <h1 className="text-xl font-semibold" style={{ fontFamily: "var(--font-dm-serif-display)" }}>
          Couldn’t load this page
        </h1>
        <p className="text-sm text-muted-foreground">
          Something went wrong. Please try again in a moment.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" onClick={() => window.location.reload()}>
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
