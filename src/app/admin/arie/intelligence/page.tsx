import Link from "next/link"
import ArieIntelligencePanel from "@/components/admin/ArieIntelligencePanel"

export const dynamic = "force-dynamic"

export default function AdminArieIntelligencePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">ARIE — Daily Intelligence</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Today&apos;s best original-post candidates. Scout → provenance → concepts → draft → QA.
            Human approve only — Publisher remains the sole X write path.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/arie/discovery"
            className="rounded-lg border border-white/20 px-3 py-2 text-sm text-muted-foreground"
          >
            Discovery
          </Link>
          <Link
            href="/admin/arie/originals"
            className="rounded-lg border border-white/20 px-3 py-2 text-sm text-muted-foreground"
          >
            Originals
          </Link>
          <Link
            href="/admin/arie/validation"
            className="rounded-lg border border-[#FFD700]/40 bg-[#FFD700]/10 px-3 py-2 text-sm font-semibold text-[#FFD700]"
          >
            Validation
          </Link>
        </div>
      </header>
      <ArieIntelligencePanel />
    </div>
  )
}
