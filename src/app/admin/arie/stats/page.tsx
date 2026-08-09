import Link from "next/link"
import ArieStatsPanel from "@/components/admin/ArieStatsPanel"

export const dynamic = "force-dynamic"

export default function AdminArieStatsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">ARIE stats</h1>
          <p className="text-sm text-muted-foreground">
            Validation totals — copy JSON for chat analysis. Prefer current promptVersion slice over
            all-time A+B%.
          </p>
        </div>
        <Link
          href="/admin/arie"
          className="rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground hover:border-[#FFD700]/40"
        >
          Eval panel
        </Link>
      </header>
      <ArieStatsPanel />
    </div>
  )
}
