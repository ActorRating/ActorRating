import { parseBulkQueueText } from "@/lib/arie/eval-queue"

describe("parseBulkQueueText", () => {
  it("parses handle blocks separated by ---", () => {
    const raw = `@boinkbuzz
Breaking: Actor joins film.

---
@ChaosCrave
Another casting line.
`
    expect(parseBulkQueueText(raw)).toEqual([
      { authorHandle: "boinkbuzz", text: "Breaking: Actor joins film." },
      { authorHandle: "chaoscrave", text: "Another casting line." },
    ])
  })
})
