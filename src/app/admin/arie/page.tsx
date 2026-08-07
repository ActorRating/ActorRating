import ArieEvalPanel from "@/components/admin/ArieEvalPanel"

export const dynamic = "force-dynamic"

export default function AdminAriePage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">ARIE eval</h1>
        <p className="text-sm text-muted-foreground">
          Grade Context Package drafts before Sprint 3. Improve the builder—not the prompt—when
          coverage is high and grades are weak.
        </p>
      </header>
      <ArieEvalPanel />
    </div>
  )
}
