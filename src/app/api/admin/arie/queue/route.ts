export const dynamic = "force-dynamic"

import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import {
  loadEvalQueue,
  parseBulkQueueText,
  queueStats,
  resetStaleInProgress,
  saveEvalQueue,
  type EvalQueueItem,
} from "@/lib/arie/eval-queue"

/** GET — queue status. Pass ?unlock=1 to return stuck in_progress items to pending. */
export async function GET(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  let state = await loadEvalQueue()
  if (request.nextUrl.searchParams.get("unlock") === "1") {
    const items = resetStaleInProgress(state.items)
    state = await saveEvalQueue({ ...state, items })
  }
  return NextResponse.json({
    ...queueStats(state.items),
    updatedAt: state.updatedAt,
    next: state.items.find((i) => i.status === "pending") ?? null,
  })
}

/**
 * POST — import queue items.
 * Body: { text: "bulk format" } or { items: [{ authorHandle, text }] }
 * Bulk format blocks separated by --- :
 *   @boinkbuzz
 *   tweet text…
 *   ---
 *   @chaoscrave
 *   tweet text…
 */
export async function POST(request: NextRequest) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = (await request.json().catch(() => null)) as null | {
    text?: string
    items?: Array<{ authorHandle?: string; text?: string }>
    replace?: boolean
  }
  if (!body) return NextResponse.json({ error: "invalid_json" }, { status: 400 })

  let parsed: Array<{ authorHandle: string; text: string }> = []
  if (typeof body.text === "string" && body.text.trim()) {
    parsed = parseBulkQueueText(body.text)
  } else if (Array.isArray(body.items)) {
    parsed = body.items
      .map((i) => ({
        authorHandle: (i.authorHandle ?? "").replace(/^@/, "").trim().toLowerCase(),
        text: (i.text ?? "").trim(),
      }))
      .filter((i) => i.authorHandle && i.text)
  }

  if (!parsed.length) {
    return NextResponse.json(
      {
        error: "no_items",
        hint: "Use blocks separated by --- with @handle on the first line and tweet text below.",
      },
      { status: 400 },
    )
  }

  const now = new Date().toISOString()
  const incoming: EvalQueueItem[] = parsed.map((p, idx) => ({
    id: `q_${Date.now().toString(36)}_${idx}`,
    authorHandle: p.authorHandle,
    text: p.text,
    status: "pending",
    createdAt: now,
  }))

  const existing = await loadEvalQueue()
  const items = body.replace
    ? incoming
    : [
        ...existing.items.filter((i) => i.status === "pending" || i.status === "in_progress"),
        ...incoming,
      ]

  const state = await saveEvalQueue({ items, updatedAt: now })
  return NextResponse.json({
    imported: incoming.length,
    ...queueStats(state.items),
  })
}
