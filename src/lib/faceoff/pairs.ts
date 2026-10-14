export type SessionPairState = {
  voted: Set<string>
  /** Consumed matchups with no vote — skips. */
  skipped: Set<string>
  /** Unconsumed matchups still on screen or prefetched. */
  open: Set<string>
}

export function classifySessionPair(input: {
  pairKey: string
  consumedAt: Date | null
  expiresAt: Date
  voted: Set<string>
  now: number
}): "voted" | "open" | "skipped" | "expired" {
  if (input.voted.has(input.pairKey)) return "voted"
  if (!input.consumedAt && input.expiresAt.getTime() > input.now) return "open"
  if (input.consumedAt) return "skipped"
  return "expired"
}

/** Voted and open pairs are always blocked. Skips are blocked until the pool runs out. */
export function blockedPairKeys(state: SessionPairState, relaxSkips: boolean): Set<string> {
  const blocked = new Set<string>([...state.voted, ...state.open])
  if (!relaxSkips) {
    for (const key of state.skipped) blocked.add(key)
  }
  return blocked
}

export function revealAfterAcceptedVotes(choiceCount: number, every = 5): boolean {
  return choiceCount > 0 && choiceCount % every === 0
}

export function winnerForSide(side: "left" | "right", leftId: string, rightId: string): string {
  return side === "left" ? leftId : rightId
}

/** A failed or incomplete response must not move the accepted-vote count. */
export function confirmedChoiceCount(
  current: number,
  responseOk: boolean,
  serverCount: number | null | undefined,
): number {
  if (!responseOk || typeof serverCount !== "number" || !Number.isFinite(serverCount)) return current
  return serverCount
}

export function motionMs(reduced: boolean, ms: number): number {
  return reduced ? 0 : ms
}
