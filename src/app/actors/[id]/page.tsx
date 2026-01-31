/**
 * Actor page: /actors/[id]
 * 410 Gone for removed/non-existent actors is handled in middleware (via API check).
 */

import ActorPageClient from './ActorPageClient'

export const dynamic = 'force-dynamic'

export default function ActorPage() {
  return <ActorPageClient />
}
