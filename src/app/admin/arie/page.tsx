import Link from "next/link"
import ArieEvalPanel from "@/components/admin/ArieEvalPanel"

export const dynamic = "force-dynamic"

export default function AdminAriePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">ARIE eval</h1>
          <p className="text-sm text-muted-foreground">
            Sprint 2 feature-complete — validation only. Blind-grade in batches of ~25; improve the
            Context Builder only between batches. Freeze BASELINE.md before any Sprint 3 work.
          </p>
        </div>
        <Link
          href="/admin/arie/stats"
          className="rounded-lg border border-[#FFD700]/40 bg-[#FFD700]/10 px-3 py-2 text-sm font-semibold text-[#FFD700]"
        >
          Stats
        </Link>
      </header>
      <ArieEvalPanel />
    </div>
  )
}

