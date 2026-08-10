/**
 * Lightweight Brand Constitution gate for originals (deterministic).
 * Does not replace full constitution injection into LLM prompts.
 */

export type ConstitutionCheckResult = {
  passed: boolean
  errors: string[]
  warnings: string[]
}

export function checkOriginalConstitution(text: string): ConstitutionCheckResult {
  const errors: string[] = []
  const warnings: string[] = []
  const t = text.trim()

  if (!t) errors.push("constitution_empty")
  if (/\[NO REPLY\]/i.test(t) || /\[IGNORED/i.test(t)) {
    errors.push("constitution_silence_token")
  }
  if (/\u2014|\u2013/.test(t)) {
    errors.push("constitution_em_dash")
  }
  if ((t.match(/#\w+/g) || []).length > 2) {
    errors.push("constitution_hashtag_spam")
  }
  if ((t.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length > 3) {
    warnings.push("constitution_emoji_heavy")
  }
  if (/\b(guaranteed viral|buy followers|engagement pod)\b/i.test(t)) {
    errors.push("constitution_spam_growth_hacks")
  }
  if (/\b(confirmed)\b/i.test(t) && /\b(reportedly|rumor|rumour|allegedly)\b/i.test(t)) {
    errors.push("constitution_confirmed_vs_rumor")
  }
  if (t.length > 280) errors.push("constitution_over_280")

  return { passed: errors.length === 0, errors, warnings }
}
