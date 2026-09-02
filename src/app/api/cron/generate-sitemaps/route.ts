export const dynamic = "force-dynamic"
export const runtime = "nodejs"
export const maxDuration = 300

import { NextRequest, NextResponse } from "next/server"
import { spawn } from "child_process"
import fs from "fs"
import path from "path"

function authorize(request: NextRequest): boolean {
  const secret = (process.env.CRON_SECRET || process.env.EDITORIAL_CRON_SECRET || "").trim()
  if (!secret) return false

  const auth = request.headers.get("authorization") || ""
  if (auth === `Bearer ${secret}`) return true

  const querySecret = request.nextUrl.searchParams.get("secret")
  return querySecret === secret
}

function cronEnabled(): boolean {
  return process.env.SITEMAP_CRON_ENABLED !== "false"
}

function runSitemapGenerator(): Promise<{ ok: boolean; code: number; log: string }> {
  const scriptJs = path.join(process.cwd(), "scripts", "generate-sitemaps.js")
  if (!fs.existsSync(scriptJs)) {
    return Promise.resolve({
      ok: false,
      code: 1,
      log: `Missing ${scriptJs}`,
    })
  }

  return new Promise((resolve) => {
    const chunks: string[] = []
    const child = spawn(process.execPath, [scriptJs], {
      cwd: process.cwd(),
      env: process.env,
    })
    child.stdout?.on("data", (d) => chunks.push(String(d)))
    child.stderr?.on("data", (d) => chunks.push(String(d)))
    child.on("error", (err) => {
      resolve({ ok: false, code: 1, log: `${chunks.join("")}\n${err.message}` })
    })
    child.on("close", (code) => {
      resolve({
        ok: code === 0,
        code: code ?? 1,
        log: chunks.join(""),
      })
    })
  })
}

/**
 * Regenerate static sitemaps (atomic publish to public/sitemaps).
 *
 * Coolify Scheduled Task (preferred — no HTTP timeout):
 *   node scripts/run-generate-sitemaps-cron.js
 *
 * Or:
 *   curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" \
 *     https://actorrating.com/api/cron/generate-sitemaps
 */
export async function POST(request: NextRequest) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!cronEnabled()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "SITEMAP_CRON_ENABLED=false",
    })
  }

  const started = Date.now()
  const result = await runSitemapGenerator()
  const manifestPath = path.join(process.cwd(), "public", "sitemaps", "_manifest.json")
  let manifest: unknown = null
  try {
    if (fs.existsSync(manifestPath)) {
      manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"))
    }
  } catch {
    manifest = null
  }

  return NextResponse.json(
    {
      ok: result.ok,
      code: result.code,
      elapsedMs: Date.now() - started,
      manifest,
      logTail: result.log.slice(-4000),
    },
    { status: result.ok ? 200 : 500 },
  )
}

export async function GET(request: NextRequest) {
  return POST(request)
}
