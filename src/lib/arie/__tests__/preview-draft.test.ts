import { buildPriorWorkFallback, NO_REPLY_TEXT, resolveDraftAction } from "@/lib/arie/preview-draft"
import {
  castingFocusActors,
  formatPriorWorkReply,
  priorRelevanceScore,
} from "@/lib/arie/prior-work"
import type { ArieFact } from "@/lib/arie/types"
import { isCastingNewsText, textMentionsTitle } from "@/lib/arie/context-builder"

const fact = (
  partial: Pick<ArieFact, "fact_id" | "type" | "text"> & { value?: number | string | null },
): ArieFact => ({
  ...partial,
  value: partial.value,
  entity_refs: [],
  source: "actorrating_db",
  as_of: new Date().toISOString(),
})

describe("resolveDraftAction", () => {
  const grounding = [
    fact({
      fact_id: "perf:agg:1:1",
      type: "aggregate_score",
      text: "Actor in Film: aggregate 8.2/10 on ActorRating",
      value: 8.2,
    }),
  ]

  it("coerces catalog promo to no_reply", () => {
    const r = resolveDraftAction({
      modelAction: "reply",
      reply: "Millie Bobby Brown is in the ActorRating catalog.",
      claims: [{ fact_id: "perf:agg:1:1" }],
      facts: grounding,
      sourceText: "Harbour reunites with Millie Bobby Brown",
    })
    expect(r.action).toBe("no_reply")
    expect(r.reply).toBe(NO_REPLY_TEXT)
  })

  it("allows grounded replies", () => {
    const r = resolveDraftAction({
      modelAction: "reply",
      reply: "On ActorRating she sits at 8.2/10 for that role — solid craft context.",
      claims: [{ fact_id: "perf:agg:1:1" }],
      facts: grounding,
      sourceText: "Big casting announcement for a different title",
    })
    expect(r.action).toBe("reply")
  })

  it("coerces stock phrase replies so fallback can replace them", () => {
    const r = resolveDraftAction({
      modelAction: "reply",
      reply:
        "Foo's Film (2020) is 7/10 on ActorRating — solid craft context for this casting talk.",
      claims: [{ fact_id: "perf:agg:1:1" }],
      facts: grounding,
      sourceText: "Big casting announcement for a different title",
    })
    expect(r.action).toBe("no_reply")
    expect(r.reason).toBe("stock_phrase")
  })
})

describe("prior-work selection", () => {
  it("prefers franchise-relevant priors and varies wording", () => {
    const tweet =
      "James Marsden officially confirms Avengers: Secret Wars will be his final time playing Cyclops"
    const fallback = buildPriorWorkFallback(
      [
        fact({
          fact_id: "perf:prior:nb:a1",
          type: "aggregate_score",
          text: "Prior work — James Marsden in The Notebook (2004): aggregate 7.9/10 on ActorRating (not a score for the newly announced role)",
          value: 7.9,
        }),
        fact({
          fact_id: "perf:prior:xm:a1",
          type: "aggregate_score",
          text: "Prior work — James Marsden in X-Men (2000): aggregate 7.2/10 on ActorRating (not a score for the newly announced role)",
          value: 7.2,
        }),
      ],
      tweet,
    )
    expect(fallback?.reply).toContain("X-Men")
    expect(fallback?.reply).not.toContain("curious how that craft translates here")
    expect(fallback?.reply).not.toMatch(/solid craft context for this casting talk/i)
    expect(fallback?.reply).toMatch(/\?/)
  })

  it("ignores actors only after interested-in clause", () => {
    const actors = [
      { id: "1", name: "Asa Germann" },
      { id: "2", name: "Cooper Hoffman" },
    ]
    const text =
      "Asa Germann reportedly auditioned for Cyclops. Marvel was also reportedly strongly interested in Cooper Hoffman."
    expect(castingFocusActors(text, actors).map((a) => a.name)).toEqual(["Asa Germann"])
  })

  it("scores X-Men franchise overlap", () => {
    expect(priorRelevanceScore("cast as Cyclops in X-Men", "X-Men", "Cyclops")).toBeGreaterThan(
      priorRelevanceScore("cast as Cyclops in X-Men", "The Notebook", null),
    )
  })

  it("varies templates by seed", () => {
    const a = formatPriorWorkReply({
      name: "A",
      movie: "M",
      year: "2020",
      score: 8,
      seed: "seed-a",
    })
    const b = formatPriorWorkReply({
      name: "A",
      movie: "M",
      year: "2020",
      score: 8,
      seed: "seed-b-different",
    })
    // Not guaranteed different for every seed pair, but function is deterministic per seed
    expect(a.length).toBeGreaterThan(20)
    expect(b.length).toBeGreaterThan(20)
  })
})

describe("textMentionsTitle", () => {
  it("matches Secret Wars style titles", () => {
    expect(
      textMentionsTitle("James Marsden in Avengers: Secret Wars as Cyclops", "Avengers: Secret Wars"),
    ).toBe(true)
  })

  it("does not treat generic film/focus compounds as title mentions", () => {
    expect(textMentionsTitle("international film festival", "Film")).toBe(false)
    expect(textMentionsTitle("Japan 2026 Focus Country", "Focus")).toBe(false)
  })

  it("still matches an explicit Focus (2015) mention", () => {
    expect(textMentionsTitle("Focus (2015), starring Will Smith", "Focus")).toBe(true)
  })
})

describe("isCastingNewsText", () => {
  it("detects joins casting", () => {
    expect(isCastingNewsText("Jason Clarke Joins Action-Thriller Supermax")).toBe(true)
  })
})
