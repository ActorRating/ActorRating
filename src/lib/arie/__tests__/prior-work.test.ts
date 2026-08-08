import {
  castingFocusActors,
  formatPriorWorkReply,
  priorRelevanceScore,
} from "@/lib/arie/prior-work"

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

  it("formats without stock translates phrase", () => {
    const reply = formatPriorWorkReply({
      name: "Chris Evans",
      movie: "Knives Out",
      year: "2019",
      score: 8.1,
      seed: "evans-farewell",
    })
    expect(reply).not.toMatch(/curious how that craft translates here/i)
    expect(reply).toContain("8.1")
  })
})
