import Link from "next/link"
import ArieOriginalsPanel from "@/components/admin/ArieOriginalsPanel"

export const dynamic = "force-dynamic"

export default function AdminArieOriginalsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">ARIE originals</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Original Content Opportunity Engine — score events, generate distinct concepts, draft,
            QA, human approve, then publish via the existing Publisher. Auto-publish stays off.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/arie"
            className="rounded-lg border border-white/20 px-3 py-2 text-sm text-muted-foreground"
          >
            Reply eval
          </Link>
          <Link
            href="/admin/arie/intelligence"
            className="rounded-lg border border-[#FFD700]/40 bg-[#FFD700]/10 px-3 py-2 text-sm font-semibold text-[#FFD700]"
          >
            Daily Intelligence
          </Link>
          <Link
            href="/admin/arie/validation"
            className="rounded-lg border border-[#FFD700]/40 bg-[#FFD700]/10 px-3 py-2 text-sm font-semibold text-[#FFD700]"
          >
            Validation
          </Link>
          <Link
            href="/admin/arie/stats"
            className="rounded-lg border border-[#FFD700]/40 bg-[#FFD700]/10 px-3 py-2 text-sm font-semibold text-[#FFD700]"
          >
            Reply stats
          </Link>
        </div>
      </header>
      <ArieOriginalsPanel />
    </div>
  )
}
