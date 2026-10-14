export type VoteRuleInput = {
  sessionId: string
  matchupSessionId: string
  leftId: string
  rightId: string
  winnerId: string
  expiresAt: Date
  consumedAt: Date | null
  now: Date
  leftEligible: boolean
  rightEligible: boolean
  sameType: boolean
  alreadyVoted: boolean
  choiceCount: number
  maxChoices: number
}

export type VoteRuleResult =
  | { ok: true }
  | { ok: false; status: 400 | 401 | 409 | 429; error: string }

export function evaluateVoteRules(input: VoteRuleInput): VoteRuleResult {
  if (input.sessionId !== input.matchupSessionId) {
    return { ok: false, status: 401, error: "This matchup belongs to another session." }
  }
  if (input.leftId === input.rightId) {
    return { ok: false, status: 400, error: "A matchup needs two different choices." }
  }
  if (input.winnerId !== input.leftId && input.winnerId !== input.rightId) {
    return { ok: false, status: 400, error: "Choose one of the two performances in this matchup." }
  }
  if (!input.sameType) {
    return { ok: false, status: 400, error: "Those two choices cannot be compared." }
  }
  if (!input.leftEligible || !input.rightEligible) {
    return { ok: false, status: 409, error: "This matchup is no longer available." }
  }
  if (input.consumedAt || input.expiresAt.getTime() <= input.now.getTime()) {
    return { ok: false, status: 409, error: "This matchup has expired." }
  }
  if (input.alreadyVoted) {
    return { ok: false, status: 409, error: "You already chose a winner for this matchup." }
  }
  if (input.choiceCount >= input.maxChoices) {
    return { ok: false, status: 429, error: "This session has reached its comparison limit." }
  }
  return { ok: true }
}
