import { governorAllowsOpportunity, type GovernorSnapshot } from "@/lib/arie/cost-governor"

function snap(partial: Partial<GovernorSnapshot>): GovernorSnapshot {
  return {
    enabled: true,
    periodKey: "2026-08",
    budgetUsd: 20,
    spentUsd: 0,
    usedRatio: 0,
    band: "normal",
    minOpportunityScore: 70,
    allowPaidCalls: true,
    ...partial,
  }
}

describe("arie cost governor", () => {
  it("allows normal scores at base band", () => {
    const r = governorAllowsOpportunity(snap({ band: "normal", minOpportunityScore: 70 }), {
      opportunityScore: 72,
    })
    expect(r.allowed).toBe(true)
  })

  it("blocks when budget exhausted", () => {
    const r = governorAllowsOpportunity(
      snap({ band: "stopped", allowPaidCalls: false, minOpportunityScore: 101 }),
      { opportunityScore: 99 },
    )
    expect(r.allowed).toBe(false)
    expect(r.reason).toBe("budget_exhausted")
  })

  it("at high_or_bump allows priority authors below score bar", () => {
    const r = governorAllowsOpportunity(
      snap({ band: "high_or_bump", minOpportunityScore: 80 }),
      { opportunityScore: 60, priorityAuthor: true },
    )
    expect(r.allowed).toBe(true)
  })

  it("requires 85+ in score_85 band", () => {
    const low = governorAllowsOpportunity(snap({ band: "score_85", minOpportunityScore: 85 }), {
      opportunityScore: 84,
    })
    const high = governorAllowsOpportunity(snap({ band: "score_85", minOpportunityScore: 85 }), {
      opportunityScore: 85,
    })
    expect(low.allowed).toBe(false)
    expect(high.allowed).toBe(true)
  })
})
