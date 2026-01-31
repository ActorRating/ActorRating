/**
 * Actor page: /actors/[id]
 * Returns 410 Gone if actor no longer exists (e.g. removed from DB).
 */

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import ActorPageClient from './ActorPageClient'

export const dynamic = 'force-dynamic'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function ActorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  if (!id) {
    return new NextResponse(null, { status: 410 })
  }

  // Known removed adult-content URLs were rewritten to UUIDs
  if (UUID_REGEX.test(id)) {
    return new NextResponse(null, { status: 410, headers: { 'Cache-Control': 'public, max-age=86400' } })
  }

  const actor = await prisma.actor.findFirst({
    where: { OR: [{ id }, { slug: id }] },
    select: { id: true },
  })

  if (!actor) {
    return new NextResponse(null, { status: 410, headers: { 'Cache-Control': 'public, max-age=86400' } })
  }

  return <ActorPageClient />
}
