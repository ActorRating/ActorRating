/**
 * Creator Unlock Sprint — deterministic Scout hard NO rules.
 * Code-level guardrails the LLM cannot override.
 */

import {
  classifySourceReliability,
  isTrustedOriginalSource,
} from "@/lib/arie/provenance"
import type { ExtractedEntities } from "@/lib/arie/entity-extract"

export type ScoutExclusionReason =
  | "gossip_celebrity_drama"
  | "culture_war_politics"
  | "generic_business_industry"
  | "ai_media_no_acting_angle"
  | "music_promo_no_film_angle"
  | "appearance_bait"
  | "engagement_bait"
  | "should_ignore_tag"
  | "unknown_source_rumor"
  | "unknown_source_not_news"
  | "no_actorrating_advantage"
  | "off_brand_topic"

export type ScoutExclusionResult = {
  excluded: boolean
  reason: ScoutExclusionReason | null
  code: string | null
}

const GOSSIP_RE =
  /\b(dating|divorces?|split(?:s|ting)?|pregnant|scandal|beef|feud|wedding|married|marriage|girlfriend|boyfriend|engaged|premiere drama|heated argument|couple splits?|paparazzi|private life|relationship drama|touch(?:ed|ing) her without|hold(?:ing)? any man's hand|hate(?:d)? it when touched)\b/i

const CULTURE_WAR_RE =
  /\b(culture war|trans community|gender views|ideolog|outrage|cancelled for saying|political correctness|woke|anti-woke|racist|sexist slur|nsfw title)\b/i

const POLITICS_RE =
  /\b(election|president|congress|democrat|republican|antitrust suit|threatens to pull|refuse to negotiate settlement|pull .* out of california)\b/i

const BUSINESS_INDUSTRY_RE =
  /\b(revenues? slide|earnings shoot|earnings (?:up|down)|stock price|quarterly results|merger|acquisition|layoffs?|antitrust|corporate earnings|box office hits \$\d|billion for second time)\b/i

const AI_MEDIA_GENERIC_RE =
  /\b(ai slop|ai persona label|ai generated ads|ai startup|ai model release|made with ai|these images were made with ai|gpt-|openai announces|llm release)\b/i

const AI_FILM_ACTING_ANGLE_RE =
  /\b(deepfake|de-aging|vfx|performance capture|digital double|actor likeness|ai voice|synthetic actor|cgi face)\b/i

const MUSIC_PROMO_RE =
  /\b(music video|new single|album drop|billboard hot|tour dates?|concert tickets|spotify playlist(?!.*film)|record label signed)\b/i

const FILM_ACTING_SIGNAL_RE =
  /\b(actor|actress|cast|casting|performance|director|film|movie|trailer|franchise|oscar|emmy|screenplay|role|character|marvel|nolan|avengers|spider-man)\b/i

const APPEARANCE_BAIT_RE =
  /\b(looks unreal|looks amazing|looks stunning|so hot|body goals|glowing|outfit|red carpet look|fashion|beauty)\b/i

const ENGAGEMENT_BAIT_RE =
  /\b(who agrees\??|thoughts\??$|am i the only one|change my mind|like if you|retweet if|this you\??)\b/i

const CASTING_NEWS_RE =
  /\b(casting|cast|joins|returns|trailer|confirmed|reportedly|in talks|franchise|avengers|marvel|nolan|director|award|performance|oscar)\b/i

const UNKNOWN_RUMOR_RE =
  /\b(i heard|my source says|trust me|leaked|rumor has it|insider says)\b/i

const COMMENTARY_RE =
  /\b(i think|imo\b|imho|tbh|ngl|lmao|idk|just watched|just finished|just saw|they should(?:'ve| have)|this is so|can't wait|so excited|looks mid|fell off|overrated|underrated|hot take|unpopular opinion|my opinion|watching this|on netflix (?:right now|tonight)|am i the only|why does (?:nobody|everyone)|this (?:movie|show|film|one) is (?:trash|garbage|awful|amazing|boring)|so (?:boring|mid|bad))\b/i

const FIRST_PERSON_TAKE_RE =
  /\b(i (?:just|really|can't|don't|do not|love|hate|wish|hope|feel|thought|would|wouldn't))\b/i

const NEWS_ASSERTION_RE =
  /\b(exclusive:?|breaking:?|officially\s+(?:confirms?|announces?|cast|reveals?)|(?:has been|is officially)\s+cast|in talks|reportedly|reports?\s+that|is reporting|according to|sources?\s+say|confirmed\s+(?:for|as|to|that)|announces?|announced|official\s+(?:trailer|teaser|first look)|trailer\s+(?:drops?|debuts?|arrives|is\s+(?:out|here|online)|released)|teaser\s+(?:drops?|debuts?|arrives)|first look|joins?\s+(?:the\s+)?(?:cast|film|movie|franchise)|will\s+(?:star|play|direct|return|reprise)|set to\s+(?:star|play|direct|return|join)|casting\s+(?:announcement|news|revealed)|now streaming|coming to\s+(?:theaters|netflix|hbo|disney|prime)|hits theaters)\b/i

const SHOULD_IGNORE_TAG_RE = /should_ignore|gossip|culture_war|politics|irrelevant|weak_angle|no_ar_advantage/i

/** Deterministic hard NO — runs before expensive LLM stages. */
export function evaluateScoutExclusion(input: {
  text: string
  authorHandle?: string | null
  tags?: string[]
  entities?: ExtractedEntities
  /** From scoreOriginalOpportunity — thin ActorRating graph signal. */
  dataScore?: number
  /** Explicit off-brand from original-score. */
  offBrand?: boolean
}): ScoutExclusionResult {
  const text = input.text.trim()
  const tags = input.tags ?? []
  const reliability = classifySourceReliability(input.authorHandle)
  const hasFilmEntities =
    (input.entities?.actors.length ?? 0) > 0 ||
    (input.entities?.movies.length ?? 0) > 0 ||
    (input.entities?.directors.length ?? 0) > 0

  if (tags.some((t) => SHOULD_IGNORE_TAG_RE.test(t))) {
    return { excluded: true, reason: "should_ignore_tag", code: "scout_should_ignore_tag" }
  }

  if (input.offBrand) {
    return { excluded: true, reason: "off_brand_topic", code: "scout_off_brand" }
  }

  if (GOSSIP_RE.test(text)) {
    return { excluded: true, reason: "gossip_celebrity_drama", code: "scout_gossip" }
  }

  if (CULTURE_WAR_RE.test(text) && !CASTING_NEWS_RE.test(text)) {
    return { excluded: true, reason: "culture_war_politics", code: "scout_culture_war" }
  }

  if (POLITICS_RE.test(text) && !CASTING_NEWS_RE.test(text)) {
    return { excluded: true, reason: "culture_war_politics", code: "scout_politics" }
  }

  if (BUSINESS_INDUSTRY_RE.test(text) && !CASTING_NEWS_RE.test(text)) {
    return { excluded: true, reason: "generic_business_industry", code: "scout_business_news" }
  }

  if (AI_MEDIA_GENERIC_RE.test(text) && !AI_FILM_ACTING_ANGLE_RE.test(text)) {
    return { excluded: true, reason: "ai_media_no_acting_angle", code: "scout_ai_media_generic" }
  }

  if (MUSIC_PROMO_RE.test(text) && !FILM_ACTING_SIGNAL_RE.test(text)) {
    return { excluded: true, reason: "music_promo_no_film_angle", code: "scout_music_promo" }
  }

  if (
    APPEARANCE_BAIT_RE.test(text) &&
    !CASTING_NEWS_RE.test(text) &&
    !/\b(trailer|teaser|first look)\b/i.test(text)
  ) {
    return { excluded: true, reason: "appearance_bait", code: "scout_appearance_bait" }
  }

  if (ENGAGEMENT_BAIT_RE.test(text) && !hasFilmEntities) {
    return { excluded: true, reason: "engagement_bait", code: "scout_engagement_bait" }
  }

  if (
    (reliability === "UNKNOWN" || reliability === "FAN_ACCOUNT") &&
    (UNKNOWN_RUMOR_RE.test(text) || tags.some((t) => /unknown_source|rumor|should_friction/i.test(t)))
  ) {
    return { excluded: true, reason: "unknown_source_rumor", code: "scout_unknown_rumor" }
  }

  if (
    !isTrustedOriginalSource(input.authorHandle) &&
    (reliability === "UNKNOWN" || reliability === "FAN_ACCOUNT") &&
    isConversationalCommentary(text) &&
    !hasCredibleNewsAssertion(text)
  ) {
    return {
      excluded: true,
      reason: "unknown_source_not_news",
      code: "scout_unknown_source_not_news",
    }
  }

  if (typeof input.dataScore === "number" && input.dataScore < 3 && !hasFilmEntities) {
    return { excluded: true, reason: "no_actorrating_advantage", code: "scout_no_ar_advantage" }
  }

  return { excluded: false, reason: null, code: null }
}

/** True when text asserts film news from a non-trusted source without corroboration. */
export function sourceUsesReportedNewsLanguage(text: string): boolean {
  return /\b(reportedly|reports? that|is reporting|according to|sources say|if confirmed|alleged(?:ly)?|in talks|will be his final|will be her final|officially confirms)\b/i.test(
    text,
  )
}

/** Credible event/news assertion — UNKNOWN sources with this may remain eligible. */
export function hasCredibleNewsAssertion(text: string): boolean {
  return sourceUsesReportedNewsLanguage(text) || NEWS_ASSERTION_RE.test(text)
}

/** Conversational / commentary voice — not a news post. */
export function isConversationalCommentary(text: string): boolean {
  return COMMENTARY_RE.test(text) || FIRST_PERSON_TAKE_RE.test(text)
}
