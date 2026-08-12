import Link from "next/link"
import ArieDiscoveryPanel from "@/components/admin/ArieDiscoveryPanel"

export const dynamic = "force-dynamic"

export default function AdminArieDiscoveryPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">ARIE — Discovery</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Upstream candidate discovery from X (read-only). Feeds Scout → Opportunity → Daily
            Intelligence. Disabled by default until <code className="text-xs">ARIE_DISCOVERY_ENABLED=true</code>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/arie/intelligence"
            className="rounded-lg border border-[#FFD700]/40 bg-[#FFD700]/10 px-3 py-2 text-sm font-semibold text-[#FFD700]"
          >
            Intelligence
          </Link>
          <Link
            href="/admin/arie/originals"
            className="rounded-lg border border-white/20 px-3 py-2 text-sm text-muted-foreground"
          >
            Originals
          </Link>
        </div>
      </header>
      <ArieDiscoveryPanel />
    </div>
  )
}
