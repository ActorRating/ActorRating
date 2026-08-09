import {
  castingFocusActors,
  formatPriorWorkReply,
  formatScoreDisplay,
  polishReplyCopy,
  pickPriorWorkFact,
  priorRelevanceScore,
} from "@/lib/arie/prior-work"
import type { ArieFact } from "@/lib/arie/types"

describe("prior-work helpers", () => {
  it("keeps Asa not Cooper after interested-in", () => {
    const text =
      "Asa Germann reportedly auditioned for Cyclops. Marvel was also reportedly strongly interested in Cooper Hoffman."
    expect(
      castingFocusActors(text, [
        { id: "1", name: "Asa Germann" },
        { id: "2", name: "Cooper Hoffman" },
      ]).map((a) => a.name),
    ).toEqual(["Asa Germann"])
  })

  it("ranks franchise priors higher", () => {
    expect(priorRelevanceScore("final time playing Cyclops", "X-Men", "Cyclops")).toBeGreaterThan(
      priorRelevanceScore("final time playing Cyclops", "The Notebook", null),
    )
  })

  it("prefers Fall over I Want You Back for Crawl casting", () => {
    const tweet =
      "Paramount is going back to the water for a follow-up to its 2019 sleeper hit 'Crawl,' setting Mason Gooding and Emily Rudd"
    expect(priorRelevanceScore(tweet, "Fall", null, "Thriller")).toBeGreaterThan(
      priorRelevanceScore(tweet, "I Want You Back", null, "Comedy"),
    )
  })

  it("does not boost romcom from weak 'back' token", () => {
    const tweet = "Paramount is going back to the water for a Crawl follow-up"
    expect(priorRelevanceScore(tweet, "I Want You Back")).toBeLessThanOrEqual(0)
  })

  it("formats without stock phrases and invites discussion", () => {
    const reply = formatPriorWorkReply({
      name: "Chris Evans",
      movie: "Knives Out",
      year: "2019",
      score: 8.1,
      seed: "evans-farewell",
    })
    expect(reply).not.toMatch(/curious how that craft translates here/i)
    expect(reply).not.toMatch(/solid craft context for this casting talk/i)
    expect(reply).not.toMatch(/useful craft context for this casting/i)
    expect(reply).not.toMatch(/[\u2014\u2013]/)
    expect(reply).toContain("8.1")
    expect(reply).toMatch(/\?/)
  })

  it("caps scores at one decimal and replaces long dashes", () => {
    expect(formatScoreDisplay(8.252)).toBe("8.3")
    expect(formatScoreDisplay(7)).toBe("7")
    expect(polishReplyCopy("Foo is 8.252/10 — solid?")).toBe("Foo is 8.3/10, solid?")
  })

  it("picks thematically closer prior fact", () => {
    const tweet =
      "Paramount is going back to the water for a follow-up to Crawl, setting Mason Gooding"
    const facts: ArieFact[] = [
      {
        fact_id: "perf:prior:romcom:a1",
        type: "aggregate_score",
        text: "Prior work — Mason Gooding in I Want You Back (2022): aggregate 6.3/10 on ActorRating (not a score for the newly announced role)",
        value: 6.3,
        entity_refs: [],
        source: "actorrating_db",
        as_of: new Date().toISOString(),
      },
      {
        fact_id: "perf:prior:fall:a1",
        type: "aggregate_score",
        text: "Prior work — Mason Gooding in Fall (2022): aggregate 7.1/10 on ActorRating (not a score for the newly announced role)",
        value: 7.1,
        entity_refs: [],
        source: "actorrating_db",
        as_of: new Date().toISOString(),
      },
    ]
    expect(pickPriorWorkFact(facts, tweet)?.fact_id).toBe("perf:prior:fall:a1")
  })
})
