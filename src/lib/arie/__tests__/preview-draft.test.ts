import { NO_REPLY_TEXT, resolveDraftAction } from "@/lib/arie/preview-draft"
import type { ArieFact } from "@/lib/arie/types"
import { textMentionsTitle } from "@/lib/arie/context-builder"

const fact = (partial: Pick<ArieFact, "fact_id" | "type" | "text">): ArieFact => ({
  ...partial,
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

  it("coerces tautology paraphrase to no_reply", () => {
    const source =
      "Gwyneth Paltrow will return as Pepper Potts in AVENGERS: DOOMSDAY"
    const r = resolveDraftAction({
      modelAction: "reply",
      reply: "Gwyneth Paltrow will return as Pepper Potts in Avengers Doomsday",
      claims: [{ fact_id: "perf:agg:1:1" }],
      facts: grounding,
      sourceText: source,
    })
    expect(r.action).toBe("no_reply")
    expect(r.reason).toBe("tautology")
  })

  it("requires grounded claims when reply is kept", () => {
    const r = resolveDraftAction({
      modelAction: "reply",
      reply: "Her Strongest radar dim is Screen Presence at 8.4/10.",
      claims: [],
      facts: grounding,
      sourceText: "Casting news about someone elsewhere",
    })
    expect(r.action).toBe("no_reply")
    expect(r.reason).toBe("ungrounded_reply")
  })

  it("allows grounded replies", () => {
    const r = resolveDraftAction({
      modelAction: "reply",
      reply: "On ActorRating she sits at 8.2/10 for that role — curious how craft translates here.",
      claims: [{ fact_id: "perf:agg:1:1" }],
      facts: grounding,
      sourceText: "Big casting announcement for a different title",
    })
    expect(r.action).toBe("reply")
    expect(r.reason).toBe("grounded")
  })
})

describe("textMentionsTitle", () => {
  it("matches Secret Wars style titles", () => {
    expect(
      textMentionsTitle("James Marsden in Avengers: Secret Wars as Cyclops", "Avengers: Secret Wars"),
    ).toBe(true)
  })

  it("does not match unrelated Notebook", () => {
    expect(
      textMentionsTitle("James Marsden final Cyclops in Secret Wars", "The Notebook"),
    ).toBe(false)
  })
})
