jest.mock("server-only", () => ({}))

import {
  buildAnonCookieValue,
  createAnonId,
  resolveAnonSession,
  verifySignedAnonId,
} from "@/lib/anonymous-session"

describe("anonymous session", () => {
  const prevSecret = process.env.AUTH_SECRET

  beforeAll(() => {
    process.env.AUTH_SECRET = "test-secret-for-anon-cookie-signing"
  })

  afterAll(() => {
    process.env.AUTH_SECRET = prevSecret
  })

  it("mints and verifies a signed anon cookie", () => {
    const id = createAnonId()
    const cookie = buildAnonCookieValue(id)
    expect(verifySignedAnonId(cookie)).toBe(id)
  })

  it("rejects tampered cookie values", () => {
    const id = createAnonId()
    const cookie = buildAnonCookieValue(id)
    expect(verifySignedAnonId(cookie.replace(id, createAnonId()))).toBeNull()
  })

  it("reuses valid cookies and mints new ones when missing", () => {
    const id = createAnonId()
    const existing = buildAnonCookieValue(id)
    const reused = resolveAnonSession(existing)
    expect(reused.anonId).toBe(id)
    expect(reused.isNew).toBe(false)

    const fresh = resolveAnonSession(null)
    expect(fresh.isNew).toBe(true)
    expect(fresh.anonId).not.toBe(id)
  })
})
