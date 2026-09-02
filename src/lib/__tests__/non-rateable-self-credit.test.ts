import { describe, expect, it } from "vitest"
import { isSelfOnlyCreditPair, isSelfOrArchiveCredit } from "../non-rateable"

describe("isSelfOrArchiveCredit", () => {
  it("matches Self / Himself / archive footage", () => {
    expect(isSelfOrArchiveCredit("Self")).toBe(true)
    expect(isSelfOrArchiveCredit("Self - Host")).toBe(true)
    expect(isSelfOrArchiveCredit("Himself")).toBe(true)
    expect(isSelfOrArchiveCredit("archive footage")).toBe(true)
  })

  it("does not match ordinary roles", () => {
    expect(isSelfOrArchiveCredit("Narrator")).toBe(false)
    expect(isSelfOrArchiveCredit("Selfridge")).toBe(false)
  })
})

describe("isSelfOnlyCreditPair", () => {
  it("excludes pairs that only have Self credits", () => {
    expect(isSelfOnlyCreditPair(["Self", "Self - Cameo"])).toBe(true)
  })

  it("keeps pairs that also have a real role", () => {
    expect(isSelfOnlyCreditPair(["Self", "Narrator"])).toBe(false)
  })

  it("does not treat empty character lists as self-only", () => {
    expect(isSelfOnlyCreditPair([])).toBe(false)
    expect(isSelfOnlyCreditPair([null, ""])).toBe(false)
  })
})
