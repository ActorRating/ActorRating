import {
  buildSignedId,
  resolveVisitorSession,
  verifySignedId,
} from "../visitor-session"

describe("visitor-session signing", () => {
  it("round-trips a signed id and rejects tampering", () => {
    const signed = buildSignedId("visitor-1234")
    expect(verifySignedId(signed)).toBe("visitor-1234")
    expect(verifySignedId(signed.replace(/.$/, "x"))).toBeNull()
    expect(verifySignedId("visitor-1234")).toBeNull()
    expect(verifySignedId("")).toBeNull()
    expect(verifySignedId("short.sig")).toBeNull()
  })
})

describe("resolveVisitorSession", () => {
  const mint = () => "minted-id-0001"

  it("mints both ids for a first-time client", () => {
    const r = resolveVisitorSession({ visitorCookie: null, sessionCookie: null, mintId: mint })
    expect(r).toEqual({
      visitorId: "minted-id-0001",
      sessionId: "minted-id-0001",
      isNewVisitor: true,
      isNewSession: true,
    })
  })

  it("keeps a valid visitor and session", () => {
    const r = resolveVisitorSession({
      visitorCookie: buildSignedId("visitor-abcdef"),
      sessionCookie: buildSignedId("session-abcdef"),
      mintId: mint,
    })
    expect(r.visitorId).toBe("visitor-abcdef")
    expect(r.sessionId).toBe("session-abcdef")
    expect(r.isNewVisitor).toBe(false)
    expect(r.isNewSession).toBe(false)
  })

  it("starts a new session when the session cookie expired (30m inactivity)", () => {
    const r = resolveVisitorSession({
      visitorCookie: buildSignedId("visitor-abcdef"),
      sessionCookie: null,
      mintId: mint,
    })
    expect(r.visitorId).toBe("visitor-abcdef")
    expect(r.sessionId).toBe("minted-id-0001")
    expect(r.isNewSession).toBe(true)
  })

  it("never continues a session for a forged / new visitor", () => {
    const r = resolveVisitorSession({
      visitorCookie: "forged.visitor",
      sessionCookie: buildSignedId("session-abcdef"),
      mintId: mint,
    })
    expect(r.isNewVisitor).toBe(true)
    expect(r.sessionId).toBe("minted-id-0001")
  })
})
