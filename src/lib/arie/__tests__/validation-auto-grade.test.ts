import { deterministicMachineFlags } from "@/lib/arie/validation-auto-grade"
import type { PipelineResultSnapshot } from "@/lib/arie/validation-batch"

describe("validation machine grade flags", () => {
  const base: PipelineResultSnapshot = {
    opportunityId: "o",
    originalStatus: "QA_FAILED",
    originalScore: 88,
    eligible: true,
    factualConfidence: 50,
    writerMode: "REPORTED_EVENT",
    sourceReliabilityClass: "AGGREGATOR",
    sourceDistributionPriority: "HIGH",
    claimStatuses: { CONTRADICTED: 1, REPORTED: 1, VERIFIED: 1, UNVERIFIED: 0, UNKNOWN: 0 },
    evidenceSummary: null,
    selectedConcept: null,
    draftText: "Tobey Maguire will return and don the Iron Spider Suit on ActorRating.",
    qaPassed: false,
    qaIssues: [{ type: "UNVERIFIED_ASSERTION", status: "REPORTED" }],
    visualEligible: false,
    visualReason: "missing_numeric_data",
    stages: { ingest: "ok", concepts: "ok", draft: "ok", qa: "ok" },
    errors: [],
    ranAt: new Date().toISOString(),
  }

  it("flags unverified assertion and contested draft language", () => {
    const f = deterministicMachineFlags({
      sourceText: "CONFIRMED Tobey Iron Spider",
      tags: ["regression"],
      pipelineResult: base,
      status: "pipeline_done",
    })
    expect(f).toEqual(
      expect.arrayContaining([
        "qa_failed",
        "unverified_assertion",
        "draft_may_assert_contested_claim",
        "high_opp_low_confidence",
      ]),
    )
  })

  it("flags should_ignore engagement", () => {
    const f = deterministicMachineFlags({
      sourceText: "gossip",
      tags: ["should_ignore", "gossip"],
      pipelineResult: {
        ...base,
        qaPassed: true,
        qaIssues: [],
        draftText: "Engaging gossip draft on ActorRating.",
      },
      status: "pipeline_done",
    })
    expect(f).toContain("engaged_should_ignore_topic")
  })
})
