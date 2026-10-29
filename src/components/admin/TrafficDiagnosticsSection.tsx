import type { ReactNode } from "react"

/**
 * Collapsed diagnostics for /admin?tab=traffic.
 * Server-rendered <details> — no client JS required.
 */
export function TrafficDiagnosticsSection({
  children,
}: {
  children: ReactNode
}) {
  return (
    <details className="group rounded-2xl border border-border/70 bg-secondary/20">
      <summary className="cursor-pointer list-none px-6 py-4 marker:content-none [&::-webkit-details-marker]:hidden">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Diagnostics</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Non-bot pageviews, Unknown/Bot trust split, AI crawlers, referrers, recent
              pages — noisy; do not use for decisions.
            </p>
          </div>
          <span className="text-sm text-muted-foreground group-open:hidden">Show</span>
          <span className="hidden text-sm text-muted-foreground group-open:inline">Hide</span>
        </div>
      </summary>
      <div className="space-y-8 border-t border-border/60 px-6 py-6">{children}</div>
    </details>
  )
}
