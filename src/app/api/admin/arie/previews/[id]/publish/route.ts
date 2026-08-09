export const dynamic = "force-dynamic"
export const maxDuration = 60

import { NextRequest, NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { publishPreviewReply } from "@/lib/arie/publisher"

/**
 * POST — human Approve & Post for a preview draft.
 * Body: { inReplyToTweetId?: string, text?: string }
 */
export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await ctx.params
  const body = (await request.json().catch(() => ({}))) as {
    inReplyToTweetId?: string
    text?: string
  }

  const result = await publishPreviewReply({
    previewId: id,
    mode: "MANUAL",
    inReplyToTweetId: body.inReplyToTweetId,
    textOverride: body.text,
  })

  if (!result.ok) {
    const status =
      result.reason === "publish_disabled"
        ? 403
        : result.reason === "preview_not_found"
          ? 404
          : result.reason === "missing_tweet_id" || result.reason === "not_publishable_draft"
            ? 400
            : 422
    return NextResponse.json(
      { error: result.reason, previewId: id, xBody: result.xBody ?? null },
      { status },
    )
  }

  return NextResponse.json({
    ok: true,
    tweetId: result.tweetId,
    mode: result.mode,
    previewId: result.previewId,
    url: `https://x.com/i/web/status/${result.tweetId}`,
  })
}
