import type { FaceOffEntityType } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { resolveFaceOffImage, type FaceOffImageType } from "@/lib/faceoff/images"
import type { FaceOffPublicEntity } from "@/lib/faceoff/types"

function toType(entityType: FaceOffEntityType): FaceOffImageType {
  return entityType === "ACTOR" ? "actor" : "performance"
}

/** Replace cached artwork with the linked actor portrait when one exists. */
export async function hydrateFaceOffImages(entities: FaceOffPublicEntity[]): Promise<void> {
  const ids = [...new Set(entities.map((entity) => entity.id).filter(Boolean))]
  if (ids.length === 0) return
  const rows = await prisma.faceOffEntity.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      entityType: true,
      imageUrl: true,
      actor: { select: { imageUrl: true } },
      performance: {
        select: {
          actor: { select: { imageUrl: true } },
          movie: { select: { posterUrl: true } },
        },
      },
    },
  })
  const byId = new Map(rows.map((row) => [row.id, row]))
  for (const entity of entities) {
    const row = byId.get(entity.id)
    if (!row) continue
    const portrait = row.entityType === "ACTOR"
      ? row.actor?.imageUrl
      : row.performance?.actor?.imageUrl
    const poster = row.entityType === "PERFORMANCE" ? row.performance?.movie?.posterUrl : null
    entity.imageUrl = resolveFaceOffImage({
      type: toType(row.entityType),
      portraitUrl: portrait ?? null,
      posterUrl: poster ?? null,
      cachedUrl: row.imageUrl,
    })
    entity.type = toType(row.entityType)
  }
}
