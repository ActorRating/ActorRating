/**
 * Actor page: /actors/[id]
 * Prefetch actor data on the server for faster first paint.
 */

import ActorPageClient from './ActorPageClient'

export const dynamic = 'force-dynamic'

export default async function ActorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
  if (isUUID) return <ActorPageClient />
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
  try {
    const res = await fetch(`${baseUrl}/api/actors/${id}`, {
      next: { revalidate: 60 },
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) return <ActorPageClient />
    const data = await res.json()
    return (
      <ActorPageClient
        initialActor={data}
        initialPerformances={data.performances || []}
      />
    )
  } catch {
    return <ActorPageClient />
  }
}
