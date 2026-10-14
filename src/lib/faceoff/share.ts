import "server-only"
import { customAlphabet } from "nanoid"
import { prisma } from "@/lib/prisma"
import { canonicalPairKey } from "@/lib/faceoff/pair"
import { hydrateFaceOffImages } from "@/lib/faceoff/portraits"
import { readEntityMetadata } from "@/lib/faceoff/session"

const publicId = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 12)

export async function shareMatchup(leftId: string, rightId: string) {
  if (leftId === rightId) return null
  const entities = await prisma.faceOffEntity.findMany({
    where: { id: { in: [leftId, rightId] }, eligible: true },
  })
  if (entities.length !== 2) return null
  const left = entities.find((entity) => entity.id === leftId)
  const right = entities.find((entity) => entity.id === rightId)
  if (!left || !right || left.entityType !== right.entityType) return null
  const pairKey = canonicalPairKey(left.id, right.id)
  const existing = await prisma.faceOffShare.findUnique({
    where: { pairKey_mode: { pairKey, mode: left.entityType } },
    include: { left: true, right: true },
  })
  const row = existing ?? await prisma.faceOffShare.create({
    data: {
      publicId: publicId(),
      leftId: left.id,
      rightId: right.id,
      pairKey,
      mode: left.entityType,
    },
    include: { left: true, right: true },
  })
  const leftPublic = readEntityMetadata(row.left)
  const rightPublic = readEntityMetadata(row.right)
  await hydrateFaceOffImages([leftPublic, rightPublic])
  const question = row.mode === "ACTOR"
    ? `Who wins: ${leftPublic.name} or ${rightPublic.name}?`
    : `Which performance wins: ${leftPublic.name} in ${leftPublic.filmTitle ?? "their film"} or ${rightPublic.name} in ${rightPublic.filmTitle ?? "their film"}?`
  return {
    publicId: row.publicId,
    path: `/faceoff/matchup/${row.publicId}`,
    question,
    message: row.mode === "ACTOR"
      ? "Who wins? Make your pick on ActorRating."
      : "Which performance wins? Make your pick on ActorRating.",
    left: leftPublic,
    right: rightPublic,
    mode: row.mode === "ACTOR" ? "actor" as const : "performance" as const,
  }
}

export async function getShare(publicShareId: string) {
  const row = await prisma.faceOffShare.findUnique({
    where: { publicId: publicShareId },
    include: { left: true, right: true },
  })
  if (!row) return null
  const left = readEntityMetadata(row.left)
  const right = readEntityMetadata(row.right)
  await hydrateFaceOffImages([left, right])
  return {
    publicId: row.publicId,
    mode: row.mode === "ACTOR" ? "actor" as const : "performance" as const,
    left,
    right,
    available: row.left.eligible && row.right.eligible,
  }
}
