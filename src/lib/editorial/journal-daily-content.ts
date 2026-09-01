/**
 * Varied daily journal copy — avoids repeating the same story/news skeleton every day.
 */
import type { PerformanceFactsPack } from "@/lib/editorial/performance-facts"

export function journalDayHash(seed: string): number {
  let h = 5381
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) + h) ^ seed.charCodeAt(i)
  }
  return h >>> 0
}

function pickIndex(seed: string, mod: number): number {
  if (mod <= 0) return 0
  return journalDayHash(seed) % mod
}

function roleLabel(facts: PerformanceFactsPack): string {
  return facts.character?.trim() || "this role"
}

function rateHref(facts: PerformanceFactsPack): string | null {
  if (!facts.actorSlug || !facts.movieSlug) return null
  return `/rate/${facts.actorSlug}/${facts.movieSlug}`
}

function rateLink(facts: PerformanceFactsPack): string {
  const href = rateHref(facts)
  if (!href) return `Find **${facts.actorName}** in *${facts.movieTitle}* on ActorRating.`
  return `[${facts.actorName} in ${facts.movieTitle}](${href})`
}

const STORY_CTA = `Quick-rate once if you must, then break it down after one quiet scene. Edit later only if a concrete beat changed your mind — not if the timeline did.`

const CRITERIA_BLOCK = `## Score it on the five criteria

- **Emotional Range & Depth** — what feeling survives past the trailer?
- **Character Believability** — did you forget the actor, or only the brand?
- **Performance Quality** — voice, body, timing: name one precise choice.
- **Screen Presence** — who held the room when the plot stopped helping?
- **Chemistry & Interaction** — who changed someone else's temperature?

If you cannot answer at least two bullets with a scene, your score is still a draft.`

type StoryBuilder = (facts: PerformanceFactsPack, day: string) => {
  title: string
  description: string
  bodyMarkdown: string
}

const STORY_BUILDERS: StoryBuilder[] = [
  (facts, day) => {
    const role = roleLabel(facts)
    const community =
      facts.ratingCount > 0
        ? `${facts.ratingCount} logged-in rating${facts.ratingCount === 1 ? "" : "s"}`
        : "early community scores"
    return {
      title: `The quiet scene test for ${facts.actorName} in ${facts.movieTitle}`,
      description: `Today's story card: ${facts.actorName} as ${role} — can your score survive a scene with no score swell?`,
      bodyMarkdown: `*Daily journal — ${day}*

## Start with stillness

${facts.actorName} as **${role}** in *${facts.movieTitle}* (${facts.movieYear}) already has ${community} on ActorRating. Before you treat any number as settled, find the quietest scene on the card.

If your score only works on the loudest beat — trailer grammar, monologue peak, breakdown crescendo — you rated marketing, not craft.

## What to listen for

- Where does ${facts.actorName} lower their voice without losing threat or grief?
- Which reaction lands in a cutaway instead of a speech?
- Does the body keep working when the camera stops flattering them?

## Common drift on this card

- Smuggling franchise affection into **Character Believability**
- Letting discourse heat substitute for scene evidence
- Averaging lead and supporting turns into one vibe

## Do this next

Open ${rateLink(facts)} and name one still moment that would collapse if you only watched clips.`,
    }
  },
  (facts, day) => {
    const role = roleLabel(facts)
    const strong =
      facts.strongestDimensions.length > 0
        ? facts.strongestDimensions.join(" and ")
        : "Screen Presence and Character Believability"
    const weak =
      facts.weakestDimensions.length > 0
        ? facts.weakestDimensions.join(" and ")
        : "the dimension you keep skipping"
    const avg =
      facts.avg10 != null
        ? `Community average sits around **${facts.avg10.toFixed(1)}/10**`
        : "Community scores are still forming"
    return {
      title: `${facts.actorName}: where the board splits on ${facts.movieTitle}`,
      description: `${avg} on ${facts.actorName} as ${role}. Today’s drill: argue strongest vs weakest dimension, not overall vibes.`,
      bodyMarkdown: `*Daily journal — ${day}*

## Split the card, don’t blend it

${facts.actorName} as **${role}** in *${facts.movieTitle}* (${facts.movieYear}) is a good daily calibration card because it punishes one-number thinking. ${avg} — but aggregates hide arguments.

## Where readers usually agree

On this performance, **${strong}** tend to carry the most heat. That is the part people remember without prompting.

## Where honest disagreement lives

**${weak}** is where good-faith splits should live. If you cannot explain why someone scored ${weak} differently, you are comparing vibes, not craft.

## One-sentence discipline

Finish this sentence before you lock a score: "${facts.actorName} earns ${strong} in the scene where ______, but ${weak} wobbles when ______."

## Open the card

${rateLink(facts)} — compare your dimension weights to the community, not to Twitter consensus.`,
    }
  },
  (facts, day) => {
    const role = roleLabel(facts)
    const tier = facts.tier?.toLowerCase() === "supporting" ? "supporting" : "lead"
    return {
      title:
        tier === "supporting"
          ? `${facts.actorName} steers the room in ${facts.movieTitle}`
          : `${facts.actorName} carries the assignment in ${facts.movieTitle}`,
      description: `A ${tier} turn worth scoring on its own terms — ${facts.actorName} as ${role}, not as poster furniture.`,
      bodyMarkdown: `*Daily journal — ${day}*

## Name the job

${facts.actorName}'s work as **${role}** in *${facts.movieTitle}* (${facts.movieYear}) is a **${tier}** assignment on the billing card. The acting question is whether they solved the job the screenplay actually gave them — not the job the marketing wanted.

## ${tier === "supporting" ? "Supporting" : "Lead"} craft checks

${
  tier === "supporting"
    ? `- Does deleting ${facts.actorName}'s scenes change the lead's problem?\n- Who sets the temperature before the lead speaks?\n- Is this scene-stealing or scene-shaping?`
    : `- Does ${facts.actorName} carry silence without asking for pity?\n- Where does the film lean on charisma instead of choice?\n- Does the turn survive a second watch without plot surprise?`
}

## Keep cards separate

Do not average this turn with other performances from the same actor or the same franchise month. Two assignments, two scorecards.

## Score it

${rateLink(facts)} — five criteria, one role, one film.`,
    }
  },
  (facts, day) => {
    const role = roleLabel(facts)
    const director = facts.director?.trim() || "the director"
    const genres =
      facts.genres.length > 0 ? facts.genres.slice(0, 2).join(" / ") : "this genre"
    return {
      title: `How ${facts.actorName} plays against ${genres} grammar`,
      description: `${facts.movieTitle} (${facts.movieYear}) asks ${facts.actorName} to act inside ${genres} rules — under ${director}.`,
      bodyMarkdown: `*Daily journal — ${day}*

## Genre is a constraint, not an excuse

*${facts.movieTitle}* (${facts.movieYear}) ships with **${genres}** expectations and ${director}'s pacing. ${facts.actorName} as **${role}** either uses those rules or gets eaten by them.

## Three craft questions

1. **Performance Quality** — voice, body, timing: where is the precise choice instead of the default register?
2. **Character Believability** — did you forget the actor, or only the star persona?
3. **Chemistry & Interaction** — who changed when ${facts.actorName} entered the scene?

## Trailer trap

If your score collapses when you remove score swell and exposition hand-holding, reopen the card on a dialogue scene with ordinary stakes.

## Today's card

${rateLink(facts)}`,
    }
  },
  (facts, day) => {
    const role = roleLabel(facts)
    return {
      title: `Draft vs final on ${facts.actorName} in ${facts.movieTitle}`,
      description: `Community scores are public; your take should still be earned scene by scene.`,
      bodyMarkdown: `*Daily journal — ${day}*

## Public board, private evidence

${facts.actorName} as **${role}** in *${facts.movieTitle}* (${facts.movieYear}) already lives on the scoreboard${
        facts.ratingCount > 0
          ? ` with **${facts.ratingCount}** logged-in rating${facts.ratingCount === 1 ? "" : "s"}`
          : ""
      }. That is context — not permission to copy a number you have not earned.

## Good draft reasons

- You saw the film once and need a placeholder
- You are comparing two performances and have not separated the cards yet

## Bad final reasons

- The average looked authoritative
- A thread dunked your first instinct
- You wanted your profile to match consensus

## Revision drill

Reopen ${rateLink(facts)}. Change your score only if a concrete beat changed your mind — not because the timeline moved.`,
    }
  },
  (facts, day) => {
    const role = roleLabel(facts)
    return {
      title: `Chemistry audit: ${facts.actorName} in ${facts.movieTitle}`,
      description: `Who changes temperature when ${facts.actorName} is on screen as ${role}?`,
      bodyMarkdown: `*Daily journal — ${day}*

## Chemistry is not “ships”

For **${role}** in *${facts.movieTitle}* (${facts.movieYear}), ${facts.actorName}'s **Chemistry & Interaction** score should track who they rewired — not whether you wanted more screen time together.

## Scene partner test

Pick one scene with another billed performer:

- Who sets the baseline emotion?
- Who flinches first when the subtext turns?
- Does ${facts.actorName} listen, dominate, or deflect?

## If you score alone

Even solo scenes have chemistry — with the camera, with the audience, with off-screen memory. Name that relationship or leave Chemistry blank until you can.

## Open the card

${rateLink(facts)}`,
    }
  },
]

export function buildVariedStoryFromFacts(
  facts: PerformanceFactsPack,
  day: string,
): { title: string; description: string; bodyMarkdown: string; angleKey: string } {
  const seed = `${day}:${facts.actorSlug ?? facts.actorName}:${facts.movieSlug ?? facts.movieTitle}`
  const idx = pickIndex(seed, STORY_BUILDERS.length)
  const built = STORY_BUILDERS[idx]!(facts, day)
  const bodyMarkdown = `${built.bodyMarkdown.trim()}\n\n${CRITERIA_BLOCK}\n\n${STORY_CTA}`
  return { title: built.title, description: built.description, bodyMarkdown, angleKey: `angle-${idx}` }
}

type NewsTopic = {
  key: string
  title: string
  description: string
  intro: string
  sections: Array<{ heading: string; body: string }>
}

type NewsFormat = (
  topic: NewsTopic,
  day: string,
  facts: PerformanceFactsPack | null,
) => string

const NEWS_HYGIENE = `## Scoreboard hygiene

Treat quick-rates as drafts until a quiet scene confirms them. Separate lead and supporting cards. Keep box office and awards chatter in comments, not in the sliders themselves.`

const NEWS_CTA = `## Before you close the tab

Name one criterion you weighted heavily today and the scene that earned it. If the scene is missing, the score is still a draft.

## Journal rule

If your number moved because of discourse instead of a scene, put it back. Stories carry heat; news keeps the rules legible.

## Keep the rails clean

Stories carry timely performance heat. News keeps the rules legible. Both belong on a scoreboard site — neither should go dark between event weekends.`

const NEWS_FORMATS: NewsFormat[] = [
  (topic, day, facts) => {
    const lead = facts
      ? `While you read, keep ${facts.actorName} in *${facts.movieTitle}* open as a live test case — ${facts.ratingCount} logged-in rating${facts.ratingCount === 1 ? "" : "s"} on the board, not a verdict on your taste.`
      : `Pick any performance you scored this week and apply today's rule to that card instead of an abstract example.`
    const section = topic.sections[pickIndex(`${day}:${topic.key}:a`, topic.sections.length)]!
    return `*Daily journal — ${day}*

${topic.intro}

${lead}

## ${section.heading}

${section.body}

${NEWS_HYGIENE}

${NEWS_CTA}`
  },
  (topic, day, facts) => {
    const example = facts
      ? `\n\n## Live example\n\n${facts.actorName} as ${roleLabel(facts)} in *${facts.movieTitle}* (${facts.movieYear}) — ${rateLink(facts)}. Use the card to test the rule, not to borrow the average.`
      : ""
    const sections = [...topic.sections]
    const start = pickIndex(`${day}:${topic.key}:b`, sections.length)
    const first = sections[start]!
    const second = sections[(start + 1) % sections.length]!
    return `*Daily journal — ${day}*

## ${topic.title}

${topic.intro}

## ${first.heading}

${first.body}

## ${second.heading}

${second.body}${example}

${NEWS_HYGIENE}

${NEWS_CTA}`
  },
  (topic, day, facts) => {
    const checklist = topic.sections
      .map((s) => `- **${s.heading}** — ${s.body.split(".")[0]?.trim() || s.body}.`)
      .join("\n")
    const boardNote = facts
      ? `Today's board note: ${facts.actorName} / *${facts.movieTitle}* has ${facts.ratingCount} logged-in rating${facts.ratingCount === 1 ? "" : "s"}${facts.avg10 != null ? ` and a ${facts.avg10.toFixed(1)}/10 community average` : ""}.`
      : `Today's board note: pick one card you rated this month and run the checklist below on it.`
    return `*Daily journal — ${day}*

${topic.intro}

${boardNote}

## Checklist

${checklist}

## Why this matters today

${topic.sections[pickIndex(`${day}:${topic.key}:c`, topic.sections.length)]!.body}

${NEWS_HYGIENE}

${NEWS_CTA}`
  },
  (topic, day, facts) => {
    const debate = facts
      ? `Debate prompt: would you defend ${facts.actorName}'s **${facts.strongestDimensions[0] ?? "Screen Presence"}** score to someone who only remembers the trailer?`
      : `Debate prompt: would you defend your highest criterion score on a performance you rated this month — using a scene, not a vibe?`
    return `*Daily journal — ${day}*

${debate}

${topic.intro}

${topic.sections.map((s) => `## ${s.heading}\n\n${s.body}`).join("\n\n")}

${NEWS_HYGIENE}

${NEWS_CTA}`
  },
]

export function buildVariedDailyNews(
  topic: NewsTopic,
  day: string,
  facts: PerformanceFactsPack | null,
): { bodyMarkdown: string; formatKey: string } {
  const formatIdx = pickIndex(`${day}:${topic.key}`, NEWS_FORMATS.length)
  const bodyMarkdown = NEWS_FORMATS[formatIdx]!(topic, day, facts)
  return { bodyMarkdown, formatKey: `format-${formatIdx}` }
}

export type { NewsTopic }
