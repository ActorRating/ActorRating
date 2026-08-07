import ArieEvalPanel from "@/components/admin/ArieEvalPanel"

export const dynamic = "force-dynamic"

export default function AdminAriePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">ARIE eval</h1>
        <p className="text-sm text-muted-foreground">
          Validation checkpoint — not publishing. Grade drafts and sub-scores; improve the Context
          Builder until SPRINT2_EXIT is green, then freeze BASELINE.md before Sprint 3.
        </p>
      </header>
      <ArieEvalPanel />
    </div>
  )
}
