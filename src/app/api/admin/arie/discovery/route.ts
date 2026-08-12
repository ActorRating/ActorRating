export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import { requireAdminSession } from "@/lib/admin/requireAdmin"
import { loadDiscoveryDashboard } from "@/lib/arie/discovery/admin"
import { runDiscoveryEngine } from "@/lib/arie/discovery/run"
import { arieDiscoveryEnabled } from "@/lib/arie/config"

/** GET — discovery health, sources, recent candidates. Zero live X calls. */
export async function GET() {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const dashboard = await loadDiscoveryDashboard()
  return NextResponse.json(dashboard)
}

/**
 * POST — manually trigger a discovery run.
 * Requires ARIE_DISCOVERY_ENABLED=true. Kill switch is real — no force bypass.
 */
export async function POST() {
  const admin = await requireAdminSession()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  if (!arieDiscoveryEnabled()) {
    return NextResponse.json(
      {
        ok: true,
        status: "DISABLED",
        reason: "discovery_disabled",
        hint: "Set ARIE_DISCOVERY_ENABLED=true to run discovery",
      },
      { status: 200 },
    )
  }

  const result = await runDiscoveryEngine({
    triggeredBy: `admin:${admin.email ?? "unknown"}`,
  })

  return NextResponse.json(result)
}
