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
  arieOriginalPublishEnabled,
  ariePublishEnabled,
  arieXBearerToken,
  arieXWriteConfigured,
  currentBudgetPeriodKey,
} from "@/lib/arie/config"
import { getGovernorSnapshot } from "@/lib/arie/cost-governor"
import { countPublishedToday } from "@/lib/arie/publisher"
import { prisma } from "@/lib/prisma"

/** GET /api/arie/health — readiness probe (no secrets). */
export async function GET() {
  const governor = await getGovernorSnapshot().catch(() => null)
  const publishedToday = await countPublishedToday().catch(() => null)
  const schemaOk = await prisma.arieOpportunity
    .findFirst({ select: { id: true, contentType: true, predictedScore: true } })
    .then(() => true)
    .catch(() => false)

  return NextResponse.json({
    ok: true,
    engine: "ARIE",
    sprint: "originals-a-d-hardened",
    constitutionVersion: ARIE_CONSTITUTION_VERSION,
    flags: {
      ingestEnabled: arieIngestEnabled(),
      publishEnabled: ariePublishEnabled(),
      originalPublishEnabled: arieOriginalPublishEnabled(),
      autoPublishEnabled: arieAutoPublishEnabled(),
      costGovernorEnabled: arieCostGovernorEnabled(),
      groqConfigured: Boolean(arieGroqApiKey()),
      xReadConfigured: Boolean(arieXBearerToken()),
      xWriteConfigured: arieXWriteConfigured(),
    },
    schema: {
      measurementFieldsAvailable: schemaOk,
    },
    autoPublish: {
      minOpportunity: arieAutoPublishMinOpportunity(),
      dailyCap: arieAutoPublishDailyCap(),
      publishedToday,
      note: "Originals reject AUTO; reply auto remains separate and default-off",
    },
    budget: {
      periodKey: currentBudgetPeriodKey(),
      monthlyBudgetUsd: arieMonthlyBudgetUsd(),
      governor,
    },
  })
}
