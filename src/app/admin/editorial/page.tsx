import EditorialAdminPanel from "@/components/admin/EditorialAdminPanel"

export const dynamic = "force-dynamic"

export default function AdminEditorialPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold text-foreground">Performance editorial</h1>
        <p className="text-sm text-muted-foreground">
          Score-based template drafts for indexable rate pages. Edit, publish, or human-lock so cron
          never overwrites.
        </p>
      </header>
      <EditorialAdminPanel />
    </div>
  )
}
