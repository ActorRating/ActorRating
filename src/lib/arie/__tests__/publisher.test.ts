import { extractTweetId } from "@/lib/arie/x"
import { parseBulkQueueText } from "@/lib/arie/eval-queue"
import { isPublishableDraftText } from "@/lib/arie/publisher"

describe("soft-launch publish helpers", () => {
  it("extracts tweet ids from urls", () => {
    expect(extractTweetId("1850123456789012345")).toBe("1850123456789012345")
    expect(extractTweetId("https://x.com/deadline/status/1850123456789012345")).toBe(
      "1850123456789012345",
    )
    expect(extractTweetId("not a tweet")).toBeNull()
  })

  it("parses optional tweet id line in queue blocks", () => {
    const items = parseBulkQueueText(`@deadline
1850123456789012345
Jason Clarke Joins Action-Thriller Supermax

---
@boinkbuzz
No id here just text`)
    expect(items).toHaveLength(2)
    expect(items[0]?.tweetId).toBe("1850123456789012345")
    expect(items[0]?.text).toContain("Jason Clarke")
    expect(items[1]?.tweetId).toBeUndefined()
  })

  it("rejects silence drafts", () => {
    expect(isPublishableDraftText("[NO REPLY]")).toBe(false)
    expect(isPublishableDraftText("[IGNORED BY OPPORTUNITY]")).toBe(false)
    expect(isPublishableDraftText("Craft check: 8/10.")).toBe(true)
  })
})
