export const dynamic = "force-dynamic"

import { NextResponse } from "next/server"
import {
  ARIE_CONSTITUTION_VERSION,
  arieAutoPublishDailyCap,
  arieAutoPublishEnabled,
  arieAutoPublishMinOpportunity,
  arieCostGovernorEnabled,
  arieGroqApiKey,
  arieIngestEnabled,
  arieMonthlyBudgetUsd,
  ariePublishEnabled,
  arieXBearerToken,
  arieXWriteConfigured,
  currentBudgetPeriodKey,
} from "@/lib/arie/config"
import { getGovernorSnapshot } from "@/lib/arie/cost-governor"
import { countPublishedToday } from "@/lib/arie/publisher"

/** GET /api/arie/health — readiness probe (no secrets). */
export async function GET() {
  const governor = await getGovernorSnapshot().catch(() => null)
  const publishedToday = await countPublishedToday().catch(() => null)
  return NextResponse.json({
    ok: true,
    engine: "ARIE",
    sprint: "3-soft-launch",
    constitutionVersion: ARIE_CONSTITUTION_VERSION,
    flags: {
      ingestEnabled: arieIngestEnabled(),
      publishEnabled: ariePublishEnabled(),
      autoPublishEnabled: arieAutoPublishEnabled(),
      costGovernorEnabled: arieCostGovernorEnabled(),
      groqConfigured: Boolean(arieGroqApiKey()),
      xReadConfigured: Boolean(arieXBearerToken()),
      xWriteConfigured: arieXWriteConfigured(),
    },
    autoPublish: {
      minOpportunity: arieAutoPublishMinOpportunity(),
      dailyCap: arieAutoPublishDailyCap(),
      publishedToday,
    },
    budget: {
      periodKey: currentBudgetPeriodKey(),
      monthlyBudgetUsd: arieMonthlyBudgetUsd(),
      governor,
    },
  })
}
