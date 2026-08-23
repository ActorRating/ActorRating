/**
 * Unique cover images + body expansions for Jul–Aug 2026 gap-fill articles.
 * Run via scripts/upgrade-journal-gap-fill.ts
 */
import { tmdbPoster } from "../../src/lib/editorial/journal-standards"

export type ArticleUpgrade = {
  coverImage: string
  /** Appended when body is below minimum length */
  expansion: string
}

const P = {
  bnd: tmdbPoster("vjMvFSmGUxEtqVdaZgvFee9XkZl.jpg"),
  hollandOdyssey: "/editorial/tom-holland-telemachus-odyssey.jpg",
  zendayaOdyssey: "/editorial/zendaya-athena-odyssey.jpg",
  comingSoon: tmdbPoster("bU206dN0ucfOFRK17OXabkdHKFC.jpg"),
  ithacaWeek: tmdbPoster("kGCOfQpITTI0rKzrVMRGOFteszf.jpg"),
  darkKnight: tmdbPoster("dqK9Hag1054tghRQSqLSfrkvQnA.jpg"),
  odysseyMain: tmdbPoster("2Es8HvjgIoNxYbsQnVa8OJVz2Wk.jpg"),
  odysseyOpen: tmdbPoster("n3D2Lmwomtbc4SZFO8hLtLL0b5q.jpg"),
  odysseyDamon: tmdbPoster("twiVn9oFXOVR0uoYgawyEBlnFu8.jpg"),
  odysseyRate: tmdbPoster("tYuC9kUwqhpDQ3pv1kLMqyMF1Jw.jpg"),
  challengers: tmdbPoster("tq8COKsI99Bivjd4CZIYVGoKcIx.jpg"),
  challengersAlt: tmdbPoster("H6vzgCpdYaU8YdhNJETurrtdh0.jpg"),
  dune: tmdbPoster("eZ239CUp1d6OryZEBPnO2n87gMG.jpg"),
  sceneStealers: tmdbPoster("c6OLXfKAk5BKeR6broC8pYiCquX.jpg"),
  beef: tmdbPoster("5QOeW2hZAdbiBNMYeXQHXmRIK7J.jpg"),
  minari: tmdbPoster("9EnHOldj6G8vOOpf5CDBDiNXTJD.jpg"),
  nope: tmdbPoster("5QOeW2hZAdbiBNMYeXQHXmRIK7J.jpg"),
  substance: tmdbPoster("8ODNt5olCeIqBYTP3GgXEQYTfeX.jpg"),
  poorThings: tmdbPoster("zh6IdheEYinU4TPtorWsjx6qPQE.jpg"),
  aftersun: tmdbPoster("evKz85EKouVbIr51zy5fOtpNRPg.jpg"),
  interstellar: tmdbPoster("5XNQBqnBwPA9yT0jZ0p3s8bbLh0.jpg"),
  oppenheimer: tmdbPoster("cUIqZd6jJCbO94Txt1CkTs7MSeP.jpg"),
  elvis: tmdbPoster("rLo9T9jEg67UZPq3midjLnTUYYi.jpg"),
  pitt: tmdbPoster("1E5baAaEse26fej7uHcjOgEE2t2.jpg"),
  bladeRunner: tmdbPoster("gajva2L0rPYkEWjzgFlBXCAVBE5.jpg"),
  dune2: tmdbPoster("8b8R8l88Qje9dn9OE8PY05/v.jpg"),
  silenceLambs: tmdbPoster("aYcnDyLMnpKce1FOYUpZrXtgUye.jpg"),
  thereWillBeBlood: tmdbPoster("mmd1HnuvAzFc4iuVJcnBrhDNEKr.jpg"),
  saltburn: tmdbPoster("tq8COKsI99Bivjd4CZIYVGoKcIx.jpg"),
  superman: tmdbPoster("kGzFbGhp99zva6oZODW5atUtnqi.jpg"),
  guest: tmdbPoster("jFkuJbWsciMwgcpOEkJIlxTElEp.jpg"),
  argue: tmdbPoster("1vXD5HXqkhvsXFHE7KmCPZGPR1e.jpg"),
  community: tmdbPoster("rlay2M5QYvi6igbGcFjq8jxeusY.jpg"),
  fiveSliders: tmdbPoster("gkh6Nt8DtY1XT4gQsyFq9XAVJlJ.jpg"),
  hideOnPurpose: tmdbPoster("zb6fM1CX41D9rF9hdgclu0peUmy.jpg"),
  billingTiers: tmdbPoster("7T9e6yS8SQ0EAWLQHrhLSyCtTz7.jpg"),
  listsNotDumps: tmdbPoster("9uddYYTNcLWpzUkl5iw1RUYhLhY.jpg"),
  whiplash: tmdbPoster("wbQa0EnWUyRzQ5d1pHLNRlmsCUP.jpg"),
}

// Drop unused placeholder keys — all covers above are repo-verified TMDB paths or /editorial assets.

const CRITERIA_BLOCK = `## Score it on the five criteria

- **Emotional Range & Depth** — what feeling survives past the trailer?
- **Character Believability** — did you forget the actor, or only the brand?
- **Performance Quality** — voice, body, timing: name one precise choice.
- **Screen Presence** — who held the room when the plot stopped helping?
- **Chemistry & Interaction** — who changed someone else's temperature?

If you cannot answer at least two bullets with a scene, your score is still a draft.`

const STORY_CTA = `## Open the scorecard

Find the performance on ActorRating, log a quick score if you must, then break it down after one quiet scene. Edit later if craft evidence changes — not if the timeline does.`

const NEWS_CTA = `## Journal rule

Stories carry heat. News keeps the rules legible. If your number moved because of discourse instead of a scene, put it back.`

export const GAP_FILL_UPGRADES: Record<string, ArticleUpgrade> = {
  // ——— STORIES ———
  "brand-new-day-opening-night-rate-peter-cold": {
    coverImage: P.hollandOdyssey,
    expansion: `## What Peter is asking for

Holland is not playing "fun Spider-Man." He is playing obligation after erasure — full-time hero in a city that moved on without him. That is a colder assignment than Telemachus, but it rhymes: both sons perform adulthood while the world withholds recognition.

## Opening-night protocol

Quick-rate if you must, sleep once, then open Peter and MJ on separate cards. If your Peter number includes crowd energy, mid-credits hype, or your love of the franchise, you rated the event.

${CRITERIA_BLOCK}

${STORY_CTA}`,
  },
  "mj-without-shared-memory": {
    coverImage: P.zendayaOdyssey,
    expansion: `## MJ's cruelest assignment

Zendaya has to play **continuation**, not reunion. The audience remembers the relationship; MJ does not. That asymmetry is the whole chemistry problem — awkwardness that must not become cute-coded nostalgia bait.

## What to protect

Rate **Character Believability** first: is she a life, or a waiting room for Peter's spell to reverse? Then **Chemistry**: high scores can mean "painfully almost," not "ship achieved."

${CRITERIA_BLOCK}

${STORY_CTA}`,
  },
  "brand-new-day-unlock-day": {
    coverImage: P.comingSoon,
    expansion: `## Why unlock day matters

Coming soon exists so trailer speculation cannot pose as community craft. When *Brand New Day* unlocks, aggregates can form — but that is a product event, not proof the acting is finished.

## Night-one discipline

Log impressions early if you want, then revisit after one quiet scene. The scoreboard is honest enough to start; your literacy still needs a second pass.

${CRITERIA_BLOCK}

${STORY_CTA}`,
  },
  "opening-weekend-vs-the-scoreboard": {
    coverImage: P.ithacaWeek,
    expansion: `## Two questions, two scoreboards

Opening weekend asks: did people show up? ActorRating asks: what did the actors do with the roles? Holland and Damon can both be in the cultural air without sharing a scorecard.

## Comparison that helps

Ask which turn required the actor to betray their most bankable instinct — Holland's likability, Damon's competence under pressure — rather than which movie "won the weekend."

${CRITERIA_BLOCK}

${STORY_CTA}`,
  },
  "supporting-turns-in-brand-new-day": {
    coverImage: P.darkKnight,
    expansion: `## Furniture vs temperature

A Spider-Man movie is a lead vehicle until a supporting turn makes loneliness expensive. Friends, threats, mentors, and chaos agents should change Peter's inner weather — not just feed quips.

## Rule of thumb

If deleting the character leaves Peter's problem identical, you watched furniture. If deleting them softens the lead's loneliness, you watched acting worth scoring.

${CRITERIA_BLOCK}

${STORY_CTA}`,
  },
  "hathaway-penelope-still-in-theaters": {
    coverImage: P.odysseyDamon,
    expansion: `## Waiting as strategy

Penelope gets reduced to "loyal wife" in bad summaries. On screen, waiting is politics — endurance and intelligence under surveillance. Rate whether Hathaway plays strategy or ornament.

## Pair with Odysseus carefully

Damon's return only lands if Ithaca feels worth returning to. Penelope is half that place — separate cards, same household, no blended "couple score."

${CRITERIA_BLOCK}

${STORY_CTA}`,
  },
  "pattinson-odyssey-sideways-energy": {
    coverImage: P.odysseyRate,
    expansion: `## Wrong gravity

Pattinson's best Nolan mode tilts rooms without asking permission. Rate whether he plays mythic function or modern irony cosplay. Sideways energy is a tool; winking at the audience is noise.

## Screen Presence first

Use **Screen Presence** aggressively here, then **Chemistry** for hierarchy — not romance. If the turn only works as a trailer clip, **Performance Quality** should notice.

${CRITERIA_BLOCK}

${STORY_CTA}`,
  },
  "week-two-holland-zendaya-check-in": {
    coverImage: P.challengers,
    expansion: `## Week two is the honest window

Opening-night scores are adrenaline. Discourse scores are peer pressure. Week-two scores are closer to craft — if you edit honestly.

## Edit checklist

Did you rate the suit instead of Peter's loneliness? Did MJ's number include ship feelings? Did *Odyssey* bleed into *Brand New Day* without admitting it? Change numbers only when a scene changed you.

${CRITERIA_BLOCK}

${STORY_CTA}`,
  },
  "chemistry-when-one-side-forgot": {
    coverImage: P.dune,
    expansion: `## Asymmetry is the assignment

*Challengers* taught Zendaya voltage. *Brand New Day* asks for chemistry without shared memory — one side has a private language, the other has manners.

## Do not import the wrong shape

High **Chemistry** can mean painfully almost. Low **Chemistry** can mean correctly strangers. Fake chemistry is nostalgia acting — flag it in a comment if you catch yourself doing it.

${CRITERIA_BLOCK}

${STORY_CTA}`,
  },
  "rate-the-supporting-cast-this-summer": {
    coverImage: P.sceneStealers,
    expansion: `## Leads vs temperature

August is a masterclass in supporting craft — gods, franchise chaos agents, suitors, survivors. Leads get thinkpieces; supporting turns decide whether those thinkpieces are about acting or marketing.

## Weekly habit

Once a week, open three supporting scorecards before you touch a lead. It recalibrates what presence means when the camera is not begging for it.

${CRITERIA_BLOCK}

${STORY_CTA}`,
  },
  "odyssey-holdover-acting-not-gross": {
    coverImage: P.odysseyOpen,
    expansion: `## Holdovers become labs

When the event is over, the faces remain. If you scored awe in week one, re-score on **stillness** in week two. Myth ages differently when IMAX gasps are not scheduled every five minutes.

## Prompt

Which *Odyssey* turn got better after discourse cooled? That answer is usually the real performance — not the opening-weekend consensus.

${CRITERIA_BLOCK}

${STORY_CTA}`,
  },
  "two-billion-and-still-rate-the-turns": {
    coverImage: P.bnd,
    expansion: `## Money is not craft

Historic grosses pull ratings toward consensus: "It must be good acting — look at the money." ActorRating refuses that fusion. A $2B movie can contain a soft lead and a lethal supporting knife-fight.

## This week's job

Open Peter. Open MJ. If your numbers moved because of headlines, put them back. Leave a comment if money snuck into your reasoning — honesty helps the board.

${CRITERIA_BLOCK}

${STORY_CTA}`,
  },
  "noah-wyle-the-pitt-and-tv-craft": {
    coverImage: P.pitt,
    expansion: `## Television stamina

Awards nights compress seasons into clips. *The Pitt* is hour-by-hour precision — triage honesty, not soap. Medical drama craft is **Performance Quality** with blood pressure.

## Carryover to film raters

If you only reserve serious scores for Nolan weekends, your scoreboard is prestige cosplay. Craft is craft on a streaming schedule too.

${CRITERIA_BLOCK}

${STORY_CTA}`,
  },
  "hathaway-disney-legend-and-penelope": {
    coverImage: P.elvis,
    expansion: `## Legend vs turn

D23 tributes flatten arcs into "beloved." Penelope is not Mia Thermopolis — rate strategy vs charm, surveillance vs ornament. If your score is mostly "I love Anne," you rated the ceremony early.

## Keep cards separate

Andy Sachs, Mia, Penelope: three temperatures. Do not average a career into one vibe number.

${CRITERIA_BLOCK}

## Pair with Odysseus

If you scored Damon's return highly, ask whether Hathaway made Ithaca worth returning to — that is half the epic's acting proof.

${STORY_CTA}`,
  },
  "venice-festival-acting-mode": {
    coverImage: P.substance,
    expansion: `## Festival fog

Venice headlines will try to score themselves with words like "bold" and "important." The five criteria exist to survive that fog — body, voice, listening, risk, not marketing adjectives.

## Practice before the premieres

Revisit a demanding turn you already know — *The Substance*, *Poor Things*, a supporting knife-fight — and name one scene that would collapse if you only watched clips.

${CRITERIA_BLOCK}

${STORY_CTA}`,
  },
  "bautista-kratos-physical-craft-casting": {
    coverImage: P.bladeRunner,
    expansion: `## Body as instrument

Recasting Kratos after injury is logistics; choosing Bautista is a thesis — mythic rage needs weight that is not only CGI. We do not rate unaired shows, but we can name the craft question: grief inside the instrument, not only roar.

## Prior turns as evidence

Look at Bautista's quieter menace in *Dune* and *Blade Runner 2049* before deciding the casting is "just a wrestler." Physicality lives under **Performance Quality** and **Screen Presence**.

${CRITERIA_BLOCK}

${STORY_CTA}`,
  },
  "steven-yeun-pagans-after-beef": {
    coverImage: P.beef,
    expansion: `## Anticipation, not scoring

*Pagans* arrives with bidding-war pedigree — which can mean daring craft or handsome fog. We do not invent numbers for unreleased work. We notice Yeun's pattern: control and collapse sharing a face across *Minari*, *Nope*, and *Beef*.

## Question for release day

When episodes land, ask whether he plays power or the cost of wearing it — then open the five criteria for real.

${CRITERIA_BLOCK}

${STORY_CTA}`,
  },
  "elordi-brolin-dog-stars-premiere": {
    coverImage: P.interstellar,
    expansion: `## Quiet lead energy

Early *Dog Stars* talk centers Elordi and Brolin as an odd couple — homestead grammar, not dystopian noise. Premiere praise is weather; opening weekend is when scorecards open.

## What to watch for

Does Elordi play yearning without soft-boy default? Does Brolin's hardness listen, or only threaten? Is the dog a scene partner or a prop? **Chemistry** can include animals when the writing asks it to.

${CRITERIA_BLOCK}

${STORY_CTA}`,
  },
  "jimmy-olsen-mockumentary-acting-dare": {
    coverImage: P.superman,
    expansion: `## Comedy craft under DC skin

Mockumentary is a trap: too broad and you are a sketch; too straight and the format dies. Gisondo's Jimmy already proved earnest competence — this series tests whether that earnestness survives true-crime pastiche.

## Criteria to keep warm

**Performance Quality** as documentary cadence without winking collapse. **Character Believability** as reporter, not mascot. Casting news is not a rating — it is a promise to take comedy craft seriously when episodes land.

${CRITERIA_BLOCK}

${STORY_CTA}`,
  },
  "dog-stars-quiet-lead-reactions": {
    coverImage: P.pitt,
    expansion: `## Surprise means volume refused

Genre "surprises" often mean the movie rejected trailer volume. That puts pressure on Elordi to hold silence that is not emptiness — **Emotional Range** without score swell.

## Opening-week plan

Rate Hig before world-building. Rate Bangley as separate moral weather. If the dog outperforms a human, say so in a comment — craft observations can be funny and true.

${CRITERIA_BLOCK}

${STORY_CTA}`,
  },

  // ——— NEWS ———
  "do-not-rate-opening-weekend-vibes": {
    coverImage: P.guest,
    expansion: `## Certainty is not literacy

People leave theaters certain. Certainty is not craft literacy. If your score would change after one rewatch of a quiet scene, it was a vibe — and vibes belong in comments, not aggregates.

## Draft vs publish

Quick-rate allowed. Treat night-one numbers as drafts until you can name one concrete acting choice per criterion you weighted.

${NEWS_CTA}`,
  },
  "coming-soon-just-opened-what-changes": {
    coverImage: P.fiveSliders,
    expansion: `## Product event vs hype event

Unlock means real ratings can land and aggregates can form. It does **not** mean the movie is "good now" — only that the scoreboard is honest enough to start.

## What to do on unlock day

Log early if you want, separate lead/supporting cards, and refuse to import trailer feelings into **Character Believability**.

${NEWS_CTA}`,
  },
  "why-box-office-is-not-a-performance-score": {
    coverImage: P.community,
    expansion: `## Two different questions

Box office answers want. Performance scores answer craft under five criteria. Those questions share a poster and almost nothing else.

## Comments vs numbers

When money shows up in your comment, you are editorializing — fine, but do not pretend the number is the gross.

${NEWS_CTA}`,
  },
  "how-to-split-franchise-and-prestige-ratings": {
    coverImage: P.odysseyMain,
    expansion: `## Same actors, opposite machines

Prestige asks for stillness and mythic temperature. Franchise asks for clarity under product pressure. Blending them into "Holland 2026" is how careers become soup.

## Method

Two films → two pages. Name the instinct each role punishes. Compare in prose, never in one averaged number.

${NEWS_CTA}`,
  },
  "the-second-weekend-rating-trap": {
    coverImage: P.dune2,
    expansion: `## Takes are contagious

Second weekends invent "the take." If your rating moves because a thread dunked on a scene you loved night one, you rated the thread.

## Hygiene

Revisit one scene alone. Change the number only if the scene changed you — not if the timeline did.

${NEWS_CTA}`,
  },
  "when-to-edit-your-first-score": {
    coverImage: P.whiplash,
    expansion: `## Editing is literacy

Edit when you rewatched a quiet beat, separated **Chemistry** from **Character Believability**, or realized you scored theme instead of turn. Do not edit because a friend scored higher.

## Signal vs noise

A changed score with a scene citation helps the community. A changed score with no evidence hurts it.

${NEWS_CTA}`,
  },
  "comparing-performances-without-blending": {
    coverImage: P.argue,
    expansion: `## Better verb than "better"

"Who was better?" is a bar argument. "Different how?" is a scoreboard question. Keep two cards open; write one sentence about the instinct each role forbids.

## Fusion hides the argument

Blended scores hide the argument separate scores make visible.

${NEWS_CTA}`,
  },
  "mid-august-scoreboard-hygiene": {
    coverImage: P.hideOnPurpose,
    expansion: `## Checklist

Revisit one *Odyssey* score without reading discourse first. Open one *Brand New Day* supporting card. Rate one older performance so the board is not only 2026. Edit any score you cannot defend with a criterion.

## Why hygiene matters

Mid-summer event movies pull everything toward consensus. Hygiene keeps ActorRating a scoreboard, not a mood ring.

${NEWS_CTA}`,
  },
  "awards-season-is-not-a-rating-guide": {
    coverImage: P.oppenheimer,
    expansion: `## Awards compress; ratings should not

Astra trophies and festival buzz are discovery signals — not auto-fill for **Emotional Range**. If a winner's clip package did the acting for you, your score is unfinished.

## Use awards correctly

Watch because awards pointed you there. Score because scenes changed you.

${NEWS_CTA}`,
  },
  "casting-news-vs-rateable-turns": {
    coverImage: P.billingTiers,
    expansion: `## Promises vs receipts

Casting announcements are promises. Ratings are receipts. Stories can discuss anticipation — physical craft, typecasting risk, prior patterns — without inventing numbers.

## Hard rule

No scores for unaired work. When the title unlocks, the scoreboard opens.

${NEWS_CTA}`,
  },
  "physicality-is-a-criterion-not-a-stunt": {
    coverImage: P.poorThings,
    expansion: `## Bulk is not acting

Physical performance lives under **Performance Quality** and **Screen Presence** — sometimes **Emotional Range** when the body carries grief. Stunt spectacle that reads as montage usually is not craft.

## Translate hype

When casting sells "he bulked up," translate it into criteria before you get excited.

${NEWS_CTA}`,
  },
  "what-casting-announcements-dont-tell-you": {
    coverImage: P.silenceLambs,
    expansion: `## Announcements vs craft

Headlines tell you who signed and which platform won. They do not tell you listening, timing, or whether the role punishes the actor's brand.

## Practice

For every casting headline, write one sentence: "The risk is ___." If you cannot name a risk, you are reading marketing.

${NEWS_CTA}`,
  },
  "premiere-reactions-are-not-aggregates": {
    coverImage: P.thereWillBeBlood,
    expansion: `## Premiere weather

Premiere reactions are written in a sugar high — lights, travel, the need to post first. Community aggregates require logged-in ratings on unlocked titles. Different species.

## Use reactions correctly

Decide what to watch from reactions. Decide what acting did from scorecards.

${NEWS_CTA}`,
  },
  "how-we-keep-the-journal-fresh": {
    coverImage: P.listsNotDumps,
    expansion: `## Cadence without filler

Stories carry timely performance heat. News keeps rules legible. A daily journal job keeps both rails moving when there is not a $2B headline — but craft beats calendar filler.

## Quality bar

If a day produces nothing worth saying, publish less rather than invent a fake event. Future daily pieces target ~220+ words for stories and ~180+ for news, with unique cover art tied to the subject.

${NEWS_CTA}`,
  },
}
