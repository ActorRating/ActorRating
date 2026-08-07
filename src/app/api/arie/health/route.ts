export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import {
  ARIE_CONSTITUTION_VERSION,
  arieCostGovernorEnabled,
  arieGroqApiKey,
  arieIngestEnabled,
  arieMonthlyBudgetUsd,
  ariePublishEnabled,
  arieXBearerToken,
  currentBudgetPeriodKey,
} from "@/lib/arie/config"
import { getGovernorSnapshot } from "@/lib/arie/cost-governor"

/** GET /api/arie/health — Sprint 1 readiness probe (no secrets). */
export async function GET() {
  const governor = await getGovernorSnapshot().catch(() => null)
  return NextResponse.json({
    ok: true,
    engine: "ARIE",
    sprint: 1,
    constitutionVersion: ARIE_CONSTITUTION_VERSION,
    flags: {
      ingestEnabled: arieIngestEnabled(),
      publishEnabled: ariePublishEnabled(),
      costGovernorEnabled: arieCostGovernorEnabled(),
      groqConfigured: Boolean(arieGroqApiKey()),
      xConfigured: Boolean(arieXBearerToken()),
    },
    budget: {
      periodKey: currentBudgetPeriodKey(),
      monthlyBudgetUsd: arieMonthlyBudgetUsd(),
      governor,
    },
  })
}
