import { prisma } from "@/lib/prisma"

export const EVAL_QUEUE_KEY = "eval_queue_v1"

export type EvalQueueItem = {
  id: string
  authorHandle: string
  text: string
  status: "pending" | "in_progress" | "done" | "error"
  error?: string
  previewId?: string
  createdAt: string
}

export type EvalQueueState = {
  items: EvalQueueItem[]
  updatedAt: string
}

export function parseBulkQueueText(raw: string): Array<{ authorHandle: string; text: string }> {
  const chunks = raw
    .split(/\n\s*---\s*\n/)
    .map((c) => c.trim())
    .filter(Boolean)

  const out: Array<{ authorHandle: string; text: string }> = []

  for (const chunk of chunks) {
    const lines = chunk.split("\n")
    const first = lines[0]?.trim() ?? ""
    const handleMatch = first.match(/^@?([A-Za-z0-9_]{1,30})\s*$/)
    if (!handleMatch) continue
    const authorHandle = handleMatch[1].toLowerCase()
    const text = lines.slice(1).join("\n").trim()
    if (!text) continue
    out.push({ authorHandle, text })
  }

  return out
}

export async function loadEvalQueue(): Promise<EvalQueueState> {
  const row = await prisma.arieConfig.findUnique({ where: { key: EVAL_QUEUE_KEY } })
  if (!row?.value || typeof row.value !== "object") {
    return { items: [], updatedAt: new Date().toISOString() }
  }
  const value = row.value as EvalQueueState
  return {
    items: Array.isArray(value.items) ? value.items : [],
    updatedAt: value.updatedAt ?? new Date().toISOString(),
  }
}

export async function saveEvalQueue(state: EvalQueueState): Promise<EvalQueueState> {
  const next = { ...state, updatedAt: new Date().toISOString() }
  await prisma.arieConfig.upsert({
    where: { key: EVAL_QUEUE_KEY },
    create: { key: EVAL_QUEUE_KEY, value: next },
    update: { value: next },
  })
  return next
}

export function queueStats(items: EvalQueueItem[]) {
  return {
    pending: items.filter((i) => i.status === "pending").length,
    inProgress: items.filter((i) => i.status === "in_progress").length,
    done: items.filter((i) => i.status === "done").length,
    error: items.filter((i) => i.status === "error").length,
    total: items.length,
  }
}

/** Reset stuck in_progress rows (e.g. client aborted, worker died). */
export function resetStaleInProgress(items: EvalQueueItem[]): EvalQueueItem[] {
  return items.map((i) =>
    i.status === "in_progress" ? { ...i, status: "pending" as const, error: undefined } : i,
  )
}
