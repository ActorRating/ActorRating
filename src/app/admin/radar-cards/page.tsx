import RadarCardsAdminPanel from "@/components/admin/RadarCardsAdminPanel"

export const dynamic = "force-dynamic"

export default function AdminRadarCardsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Radar cards</h1>
        <p className="text-sm text-muted-foreground">
          Search performances with logged-in user ratings, preview the radar chart, and download PNG
          or SVG for content.
        </p>
      </header>
      <RadarCardsAdminPanel />
    </div>
  )
}
