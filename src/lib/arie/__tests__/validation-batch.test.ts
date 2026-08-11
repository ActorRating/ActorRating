import { readFileSync } from "fs"
import path from "path"
import {
  computeAggregateMetrics,
  corpusHash,
  mergeCorpusItems,
  parseUploadedCorpus,
  resolveCorpusVersion,
  selectCasesForReview,
  sourceDistribution,
  type CorpusItem,
  type PipelineResultSnapshot,
} from "@/lib/arie/validation-batch"

const corpusPath = path.join(process.cwd(), "docs/arie/corpus/originals-v1.json")

describe("validation batch — corpus & sampling", () => {
  const seed = JSON.parse(readFileSync(corpusPath, "utf8")) as {
    corpusVersion: string
    items: CorpusItem[]
  }

  it("ships originals-v1 with Tobey/BoinkBuzz Iron Spider regression fixture", () => {
    expect(seed.corpusVersion).toBe("originals-v1")
    const tobey = seed.items.find((i) => i.id === "tobey-boinkbuzz-iron-spider")
    expect(tobey).toBeTruthy()
    expect(tobey!.authorHandle.toLowerCase()).toBe("boinkbuzz")
    expect(tobey!.text).toMatch(/Iron Spider/i)
    expect(tobey!.corrections?.[0]).toMatch(/no credible sources/i)
    expect(tobey!.tags).toEqual(expect.arrayContaining(["regression", "unverified_costume"]))
  })

  it("parses uploaded JSON array and objects with items", () => {
    const a = parseUploadedCorpus([
      { authorHandle: "@Deadline", text: "Actor X joins Film Y" },
    ])
    expect(a[0]!.authorHandle).toBe("deadline")
    expect(a[0]!.inputOrigin).toBe("uploaded")

    const b = parseUploadedCorpus({
      items: [{ id: "u1", handle: "chaoscrave", text: "New trailer dropped" }],
    })
    expect(b[0]!.id).toBe("u1")
    expect(b[0]!.authorHandle).toBe("chaoscrave")
  })

  it("versions hybrid corpus without mutating seed identity", () => {
    const uploaded = parseUploadedCorpus([
      { id: "live1", authorHandle: "filmupdates", text: "Breaking casting news item" },
    ])
    const version = resolveCorpusVersion({
      includeSeed: true,
      seedVersion: "originals-v1",
      uploaded,
    })
    expect(version).toMatch(/^originals-v1\+upload:/)
    expect(corpusHash(uploaded)).toHaveLength(12)
  })

  it("merges seed + upload and keeps Tobey fixture", () => {
    const merged = mergeCorpusItems(seed.items, [
      { id: "live1", authorHandle: "variety", text: "Studio confirms casting", inputOrigin: "uploaded" },
    ])
    expect(merged.some((i) => i.id === "tobey-boinkbuzz-iron-spider")).toBe(true)
    expect(merged.some((i) => i.id === "live1")).toBe(true)
    expect(sourceDistribution(merged).variety).toBe(1)
  })

  it("samples edge cases including regression + contradicted without hardcoding source unreliability", () => {
    const cases = [
      {
        id: "1",
        tags: ["regression", "unverified_costume"],
        inputOrigin: "seed_fixture",
        status: "pipeline_done",
        pipelineResult: {
          opportunityId: "o1",
          originalStatus: "ELIGIBLE",
          originalScore: 91,
          eligible: true,
          factualConfidence: 52,
          writerMode: "REPORTED_EVENT",
          sourceReliabilityClass: "AGGREGATOR",
          sourceDistributionPriority: "HIGH",
          claimStatuses: { VERIFIED: 2, REPORTED: 2, UNVERIFIED: 0, CONTRADICTED: 1, UNKNOWN: 0 },
          evidenceSummary: null,
          selectedConcept: null,
          draftText: null,
          qaPassed: null,
          qaIssues: [],
          visualEligible: false,
          visualReason: "missing_numeric_data",
          stages: { ingest: "ok", concepts: "skipped", draft: "skipped", qa: "skipped" },
          errors: [],
          ranAt: new Date().toISOString(),
        } satisfies PipelineResultSnapshot,
      },
      {
        id: "2",
        tags: ["control"],
        inputOrigin: "seed_fixture",
        status: "pipeline_done",
        pipelineResult: {
          opportunityId: "o2",
          originalStatus: "ELIGIBLE",
          originalScore: 70,
          eligible: true,
          factualConfidence: 80,
          writerMode: "VERIFIED_EVENT",
          sourceReliabilityClass: "TRADE",
          sourceDistributionPriority: "MEDIUM",
          claimStatuses: { VERIFIED: 5, REPORTED: 0, UNVERIFIED: 0, CONTRADICTED: 0, UNKNOWN: 0 },
          evidenceSummary: null,
          selectedConcept: null,
          draftText: null,
          qaPassed: true,
          qaIssues: [],
          visualEligible: true,
          visualReason: null,
          stages: { ingest: "ok", concepts: "ok", draft: "ok", qa: "ok" },
          errors: [],
          ranAt: new Date().toISOString(),
        } satisfies PipelineResultSnapshot,
      },
    ]

    const selected = selectCasesForReview(cases, { maxReview: 10, alwaysIncludeRegressionTags: true })
    expect(selected.has("1")).toBe(true)
    expect(selected.get("1")!.reasons).toEqual(
      expect.arrayContaining([
        "regression_fixture",
        "contradicted_claim",
        "high_opp_low_confidence",
        "high_distribution_aggregator",
      ]),
    )
    // Must not invent a "boinkbuzz_unreliable" reason
    expect(selected.get("1")!.reasons.join(" ")).not.toMatch(/boinkbuzz_unreliable|source_bad/i)
  })

  it("computes aggregate metrics over full batch (not only review subset)", () => {
    const metrics = computeAggregateMetrics([
      {
        status: "pipeline_done",
        selectedForReview: true,
        humanGrade: "A",
        scoreTruthfulness: 5,
        scoreUsefulness: 4,
        scoreFraming: 5,
        scoreBrandVoice: 4,
        tags: ["regression"],
        sourceHandle: "boinkbuzz",
        pipelineResult: {
          opportunityId: "a",
          originalStatus: "ELIGIBLE",
          originalScore: 90,
          eligible: true,
          factualConfidence: 50,
          writerMode: "REPORTED_EVENT",
          sourceReliabilityClass: "AGGREGATOR",
          sourceDistributionPriority: "HIGH",
          claimStatuses: { CONTRADICTED: 1 },
          evidenceSummary: null,
          selectedConcept: null,
          draftText: null,
          qaPassed: null,
          qaIssues: [],
          visualEligible: null,
          visualReason: null,
          stages: { ingest: "ok", concepts: "skipped", draft: "skipped", qa: "skipped" },
          errors: [],
          ranAt: "",
        },
      },
      {
        status: "pipeline_done",
        selectedForReview: false,
        humanGrade: null,
        scoreTruthfulness: null,
        scoreUsefulness: null,
        scoreFraming: null,
        scoreBrandVoice: null,
        tags: [],
        sourceHandle: "deadline",
        pipelineResult: {
          opportunityId: "b",
          originalStatus: "ELIGIBLE",
          originalScore: 70,
          eligible: true,
          factualConfidence: 70,
          writerMode: "REPORTED_EVENT",
          sourceReliabilityClass: "TRADE",
          sourceDistributionPriority: "HIGH",
          claimStatuses: { REPORTED: 1 },
          evidenceSummary: null,
          selectedConcept: null,
          draftText: null,
          qaPassed: null,
          qaIssues: [],
          visualEligible: null,
          visualReason: null,
          stages: { ingest: "ok", concepts: "skipped", draft: "skipped", qa: "skipped" },
          errors: [],
          ranAt: "",
        },
      },
    ])

    expect(metrics.totalCases).toBe(2)
    expect(metrics.selectedForReview).toBe(1)
    expect(metrics.graded).toBe(1)
    expect(metrics.abRatePercent).toBe(100)
    expect(metrics.avgOpportunityScore).toBe(80)
  })
})
