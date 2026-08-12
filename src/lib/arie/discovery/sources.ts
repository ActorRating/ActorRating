/**
 * Discovery source configuration — DB-backed, seeded from default JSON.
 */

import { readFileSync } from "fs"
import { join } from "path"
import { prisma } from "@/lib/prisma"
import type { DiscoverySourceConfig } from "@/lib/arie/discovery/types"

export function buildSourceKey(source: Pick<DiscoverySourceConfig, "sourceType" | "handle" | "query">): string {
  if (source.sourceType === "account") {
    const h = (source.handle ?? "").replace(/^@/, "").trim().toLowerCase()
    return `account:${h}`
  }
  const q = (source.query ?? "").trim().toLowerCase()
  return `keyword:${q}`
}

export function loadDefaultDiscoverySources(): DiscoverySourceConfig[] {
  const path = join(process.cwd(), "docs/arie/discovery-sources.default.json")
  const raw = readFileSync(path, "utf8")
  return JSON.parse(raw) as DiscoverySourceConfig[]
}

export async function seedDiscoverySourcesIfEmpty(): Promise<number> {
  const count = await prisma.arieDiscoverySource.count()
  if (count > 0) return 0

  const defaults = loadDefaultDiscoverySources()
  let created = 0
  for (const src of defaults) {
    const sourceKey = buildSourceKey(src)
    await prisma.arieDiscoverySource.create({
      data: {
        provider: "X",
        sourceType: src.sourceType,
        sourceKey,
        handle: src.handle?.replace(/^@/, "").toLowerCase() ?? null,
        query: src.query ?? null,
        enabled: src.enabled ?? true,
        priority: src.priority ?? 50,
        topicTags: src.topicTags ?? [],
        pollIntervalMinutes: src.pollIntervalMinutes ?? 15,
        maxCandidatesPerPoll: src.maxCandidatesPerPoll ?? 10,
      },
    })
    created += 1
  }
  return created
}

export async function listEnabledDiscoverySources(limit: number) {
  return prisma.arieDiscoverySource.findMany({
    where: { enabled: true, provider: "X" },
    orderBy: [{ priority: "desc" }, { updatedAt: "asc" }],
    take: limit,
  })
}

export async function markSourcePolled(
  sourceId: string,
  input: { lastSeenPostId?: string | null; authorId?: string | null; error?: string | null },
) {
  await prisma.arieDiscoverySource.update({
    where: { id: sourceId },
    data: {
      lastPolledAt: new Date(),
      ...(input.lastSeenPostId != null ? { lastSeenPostId: input.lastSeenPostId } : {}),
      ...(input.authorId != null ? { authorId: input.authorId } : {}),
      lastError: input.error ?? null,
    },
  })
}
