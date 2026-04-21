const BAD_WORDS = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "bastard",
  "cunt",
  "dick",
  "pussy",
  "nigger",
  "nigga",
  "faggot",
  "retard",
  "whore",
  "slut",
  "kike",
  "chink",
  "spic",
  "twat",
]

const BAD_WORDS_SET = new Set(BAD_WORDS)

function normalizeForProfanityCheck(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    // Remove only common separator bypass chars, keep other symbols as separators for tokenization.
    .replace(/[ ._-]+/g, "")
}

export function containsBadWord(input: string): boolean {
  const normalized = normalizeForProfanityCheck(input)
  if (!normalized) return false

  const tokens = normalized.split(/[^a-z0-9]+/).filter(Boolean)
  return tokens.some((token) => BAD_WORDS_SET.has(token))
}

