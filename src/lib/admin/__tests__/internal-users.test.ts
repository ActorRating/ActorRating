/**
 * @jest-environment node
 */
import { Prisma } from "@prisma/client"
import {
  parseInternalUserIdsFromEnv,
  prismaWhereUserIdNotInternal,
  resetInternalUserIdsCacheForTests,
  sqlUserIdNotInternal,
} from "@/lib/admin/internal-users"

describe("parseInternalUserIdsFromEnv", () => {
  it("returns empty for unset / blank", () => {
    expect(parseInternalUserIdsFromEnv(undefined)).toEqual([])
    expect(parseInternalUserIdsFromEnv("")).toEqual([])
    expect(parseInternalUserIdsFromEnv("  , , ")).toEqual([])
  })

  it("splits, trims, and dedupes", () => {
    expect(parseInternalUserIdsFromEnv(" a,b , a ,c")).toEqual(["a", "b", "c"])
  })
})

describe("sqlUserIdNotInternal", () => {
  it("is TRUE when the id list is empty (no filter)", () => {
    const frag = sqlUserIdNotInternal([])
    // Prisma.sql empty-true fragment stringifies with TRUE
    expect(frag.strings.join("")).toContain("TRUE")
  })

  it("emits NOT IN when ids are present", () => {
    const frag = sqlUserIdNotInternal(["id1", "id2"])
    const compiled = Prisma.sql`SELECT 1 WHERE ${frag}`
    // Values are bound separately; strings should reference NOT IN
    expect(compiled.strings.join(" ")).toMatch(/NOT IN/i)
    expect(compiled.values).toEqual(expect.arrayContaining(["id1", "id2"]))
  })
})

describe("prismaWhereUserIdNotInternal", () => {
  it("returns empty object when no ids", () => {
    expect(prismaWhereUserIdNotInternal([])).toEqual({})
  })

  it("keeps guests and excludes listed ids", () => {
    expect(prismaWhereUserIdNotInternal(["u1"])).toEqual({
      OR: [{ userId: null }, { userId: { notIn: ["u1"] } }],
    })
  })
})

describe("public community scores stay independent", () => {
  it("community-stats module does not import internal-users", async () => {
    resetInternalUserIdsCacheForTests()
    // Dynamic import of the public scorer — must not pull admin filter.
    const community = await import("@/lib/ratings/community-stats")
    const src = require("fs").readFileSync(
      require("path").join(
        process.cwd(),
        "src/lib/ratings/community-stats.ts",
      ),
      "utf8",
    )
    expect(src).not.toMatch(/internal-users|INTERNAL_USER_IDS/)
    expect(typeof community.getCommunityStatsForPair).toBe("function")
  })
})
