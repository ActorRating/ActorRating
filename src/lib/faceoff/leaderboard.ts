import "server-only"
import type { FaceOffEntityType } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { FACEOFF_MIN_COMPARISONS } from "@/lib/faceoff/constants"
import { hydrateFaceOffImages } from "@/lib/faceoff/portraits"
import { readEntityMetadata } from "@/lib/faceoff/session"

const PAGE_SIZE = 20

export async function faceOffLeaderboard(type: "actor" | "performance", page: number) {
  const entityType: FaceOffEntityType = type === "actor" ? "ACTOR" : "PERFORMANCE"
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1
  const where = {
    entityType,
    eligible: true,
    comparisonCount: { gte: FACEOFF_MIN_COMPARISONS },
  }
  const [total, rows] = await Promise.all([
    prisma.faceOffEntity.count({ where }),
    prisma.faceOffEntity.findMany({
      where,
      orderBy: [{ elo: "desc" }, { comparisonCount: "desc" }, { id: "asc" }],
      skip: (safePage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])
  const board = rows.map((row, index) => ({
    rank: (safePage - 1) * PAGE_SIZE + index + 1,
    comparisons: row.comparisonCount,
    entity: readEntityMetadata(row),
  }))
  await hydrateFaceOffImages(board.map((row) => row.entity))
  return {
    type,
    page: safePage,
    pageSize: PAGE_SIZE,
    total,
    minimumComparisons: FACEOFF_MIN_COMPARISONS,
    rows: board,
  }
}
