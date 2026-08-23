/**
 * One-shot: write news/stories markdown to fill Jul 29 → Aug 23 2026.
 * Run: npx tsx scripts/seed-journal-gap-fill.ts
 */
import fs from "fs"
import path from "path"

type Related = { actorSlug: string; movieSlug: string }

type Piece = {
  kind: "news" | "stories"
  slug: string
  title: string
  description: string
  publishedAt: string
  coverImage?: string
  related?: Related[]
  body: string
}

const COVER = {
  bnd: "https://image.tmdb.org/t/p/w1280/vjMvFSmGUxEtqVdaZgvFee9XkZl.jpg",
  odyssey: "https://image.tmdb.org/t/p/w1280/2Es8HvjgIoNxYbsQnVa8OJVz2Wk.jpg",
  beef: "https://image.tmdb.org/t/p/w1280/5QOeW2hZAdbiBNMYeXQHXmRIK7J.jpg",
  pitt: "https://image.tmdb.org/t/p/w1280/7RyHzEe6OE27E5gQh6hYYtWnzz5.jpg",
  challengers: "https://image.tmdb.org/t/p/w1280/H6vzgCpdYaU8YdhNJETurrtdh0.jpg",
  dune: "https://image.tmdb.org/t/p/w1280/8b8R8l88Qje9dn9OE8PY05/v.jpg",
  substance: "https://image.tmdb.org/t/p/w1280/lqoMzC3B5vuEetL75WxuoopM7RQ.jpg",
  darkKnight: "https://image.tmdb.org/t/p/w1280/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
}

function fm(p: Piece): string {
  const lines = [
    "---",
    `title: ${JSON.stringify(p.title)}`,
    `description: ${JSON.stringify(p.description)}`,
    `publishedAt: ${p.publishedAt}`,
  ]
  if (p.coverImage) lines.push(`coverImage: ${JSON.stringify(p.coverImage)}`)
  if (p.related?.length) {
    lines.push("related:")
    for (const r of p.related) {
      lines.push(`  - actorSlug: ${r.actorSlug}`)
      lines.push(`    movieSlug: ${r.movieSlug}`)
    }
  }
  lines.push("---", "", p.body.trim(), "")
  return lines.join("\n")
}

const pieces: Piece[] = [
  // ——— STORIES ———
  {
    kind: "stories",
    slug: "brand-new-day-opening-night-rate-peter-cold",
    title: "Opening night: rate Peter cold, not the crowd",
    description:
      "Spider-Man: Brand New Day is out. Holland’s first night back as Peter will get drowned in opening-weekend noise — here’s how to keep a clean scorecard.",
    publishedAt: "2026-07-29",
    coverImage: COVER.bnd,
    related: [
      { actorSlug: "tom-holland", movieSlug: "spider-man-brand-new-day-2026" },
      { actorSlug: "zendaya", movieSlug: "spider-man-brand-new-day-2026" },
    ],
    body: `*Spider-Man: Brand New Day* is finally rateable. That does not mean you should rate the theater.

Opening night is a weather system: applause, memes, mid-credits, the person behind you explaining lore. None of that belongs on Holland’s scorecard.

## What Peter is actually asking for

This turn is about **obligation after erasure** — full-time Spider-Man in a world that moved on without him. If your score is mostly “fun Spidey movie,” you rated the product.

## Opening-night protocol

1. Quick-rate if you must.
2. Sleep once.
3. Open the five criteria for Peter alone.
4. Open MJ on a separate card — do not average the couple.

If you just came from *The Odyssey*, keep Telemachus in another tab. Same face. Different job.`,
  },
  {
    kind: "stories",
    slug: "mj-without-shared-memory",
    title: "Zendaya’s MJ: continuity without shared memory",
    description:
      "Brand New Day’s cruelest acting assignment isn’t the suit — it’s MJ living a life the audience remembers and she doesn’t.",
    publishedAt: "2026-07-30",
    coverImage: COVER.bnd,
    related: [
      { actorSlug: "zendaya", movieSlug: "spider-man-brand-new-day-2026" },
      { actorSlug: "tom-holland", movieSlug: "spider-man-brand-new-day-2026" },
    ],
    body: `Franchise cinema loves reunion. *Brand New Day* asks Zendaya to do the opposite: **continue**.

MJ has to feel like a finished person, not a waiting room for Peter’s spell to reverse. Chemistry here is asymmetrical — one side has a private language, the other has manners.

## What to protect on the scorecard

- **Character Believability** — is she a life, or a plot device with good lighting?
- **Chemistry** — awkwardness that isn’t cute-coded.
- **Emotional Range** — warmth without nostalgia bait.

If your MJ score is really a vote for “I missed them together,” say so in a comment. Don’t smuggle it into the number.`,
  },
  {
    kind: "stories",
    slug: "brand-new-day-unlock-day",
    title: "Unlock day: Coming soon is over — the scoreboard is open",
    description:
      "July 31 wide release means Brand New Day performances leave Coming soon. Rate the turns, not the event calendar.",
    publishedAt: "2026-07-31",
    coverImage: COVER.bnd,
    related: [
      { actorSlug: "tom-holland", movieSlug: "spider-man-brand-new-day-2026" },
      { actorSlug: "zendaya", movieSlug: "spider-man-brand-new-day-2026" },
    ],
    body: `ActorRating’s Coming soon gate exists for one reason: trailer averages are lies with good posters.

Today the gate drops for *Brand New Day*. That is a permission slip for craft scores — not a mandate to flood the board with vibes.

## What unlock day is for

- Logging first impressions before discourse averages them
- Separating Holland / Zendaya / supporting turns
- Not crowning a “best Spidey” before you’ve seen the quiet scenes twice

The box office story starts tonight. The acting story starts when someone opens five sliders and means it.`,
  },
  {
    kind: "stories",
    slug: "opening-weekend-vs-the-scoreboard",
    title: "Opening weekend vs the scoreboard",
    description:
      "Brand New Day’s opening will dominate headlines. ActorRating’s job is the opposite of a weekend chart — protect the performance from the gross.",
    publishedAt: "2026-08-01",
    coverImage: COVER.bnd,
    related: [
      { actorSlug: "tom-holland", movieSlug: "spider-man-brand-new-day-2026" },
      { actorSlug: "matt-damon", movieSlug: "the-odyssey-2026" },
    ],
    body: `Opening weekend is a sport. Acting is not.

If Holland’s Peter and Damon’s Odysseus are both in the cultural air this week, resist the urge to crown a “winner.” Different films. Different stakes. Different scorecards.

## A useful comparison (the only kind)

Ask: **which turn required the actor to betray their most bankable instinct?**

Holland’s bankable instinct is likability. Damon’s is competence under pressure. Prestige and franchise punish those instincts differently.

Compare the answers. Do not average the movies.`,
  },
  {
    kind: "stories",
    slug: "supporting-turns-in-brand-new-day",
    title: "Don’t sleep on Brand New Day’s supporting temperature",
    description:
      "Leads get the discourse. Supporting turns change the weather Peter walks through — rate them like they matter.",
    publishedAt: "2026-08-02",
    coverImage: COVER.bnd,
    related: [
      { actorSlug: "tom-holland", movieSlug: "spider-man-brand-new-day-2026" },
      { actorSlug: "jon-bernthal", movieSlug: "the-odyssey-2026" },
    ],
    body: `A Spider-Man movie is a lead vehicle until a supporting turn makes loneliness expensive.

Rate the people who change Peter’s temperature — friends, threats, mentors, chaos agents. If a supporting performance only exists to feed quips, say so with a low **Character Believability**. If it makes the lead harder, that is craft.

## Rule of thumb

If you can delete the character and the lead’s inner life stays identical, you watched furniture. If deleting them softens Peter’s problem, you watched acting.`,
  },
  {
    kind: "stories",
    slug: "hathaway-penelope-still-in-theaters",
    title: "Anne Hathaway’s Penelope is still a live scorecard",
    description:
      "The Odyssey is holding. Hathaway’s Penelope isn’t a cameo of fidelity — rate the waiting as active work.",
    publishedAt: "2026-08-03",
    coverImage: COVER.odyssey,
    related: [
      { actorSlug: "anne-hathaway", movieSlug: "the-odyssey-2026" },
      { actorSlug: "matt-damon", movieSlug: "the-odyssey-2026" },
    ],
    body: `Penelope gets reduced to “loyal wife” in bad summaries. On screen, waiting is a **strategy** — politics, endurance, performance under surveillance.

Rate whether Hathaway plays intelligence or ornament. Rate whether the suitors feel like a threat she manages or a plot inconvenience around her face.

## Pairing note

Damon’s Odysseus only lands if Ithaca feels like a place worth returning to. Penelope is half of that place. Separate cards. Same household.`,
  },
  {
    kind: "stories",
    slug: "pattinson-odyssey-sideways-energy",
    title: "Robert Pattinson’s Odyssey energy refuses the center",
    description:
      "Nolan casts Pattinson like a pressure system. Rate the sideways choices — not whether he “steals” scenes from Damon.",
    publishedAt: "2026-08-04",
    coverImage: COVER.odyssey,
    related: [
      { actorSlug: "robert-pattinson", movieSlug: "the-odyssey-2026" },
      { actorSlug: "matt-damon", movieSlug: "the-odyssey-2026" },
    ],
    body: `Pattinson’s best Nolan mode is not “second lead.” It is **wrong gravity** — a performance that tilts rooms without asking permission.

In *The Odyssey*, rate whether he plays mythic function or modern irony cosplay. Sideways energy is a tool. It becomes noise when it winks at the audience instead of changing Odysseus’s problem.

## How to score it

Use **Screen Presence** aggressively. Use **Chemistry** for hierarchy, not romance. If the turn only works as a trailer clip, your Technical Skill score should notice.`,
  },
  {
    kind: "stories",
    slug: "week-two-holland-zendaya-check-in",
    title: "Week-two check-in: Holland & Zendaya after the noise",
    description:
      "Brand New Day’s second week is when first-night scores either harden into craft or dissolve into memes. Re-open the cards.",
    publishedAt: "2026-08-06",
    coverImage: COVER.bnd,
    related: [
      { actorSlug: "tom-holland", movieSlug: "spider-man-brand-new-day-2026" },
      { actorSlug: "zendaya", movieSlug: "spider-man-brand-new-day-2026" },
    ],
    body: `Week two is the honest window.

Opening night scores are adrenaline. Discourse scores are peer pressure. Week-two scores are closer to craft — if you bother to edit.

## Edit checklist

- Did you rate the suit instead of Peter’s loneliness?
- Did MJ’s number include your ship feelings?
- Did Odyssey bleed into Brand New Day without a sentence admitting it?

Change the number if the answer is yes. That is not flip-flopping. That is literacy.`,
  },
  {
    kind: "stories",
    slug: "chemistry-when-one-side-forgot",
    title: "Chemistry homework when one side forgot",
    description:
      "Brand New Day turns Chemistry into an asymmetrical criterion. Here’s how to score it without cheating.",
    publishedAt: "2026-08-08",
    coverImage: COVER.challengers,
    related: [
      { actorSlug: "zendaya", movieSlug: "spider-man-brand-new-day-2026" },
      { actorSlug: "zendaya", movieSlug: "challengers-2024" },
      { actorSlug: "tom-holland", movieSlug: "spider-man-brand-new-day-2026" },
    ],
    body: `*Challengers* taught Zendaya voltage. *Brand New Day* asks for something colder: chemistry that cannot rely on shared memory.

## Asymmetry rules

- High Chemistry can mean “painfully almost.”
- Low Chemistry can mean “correctly strangers.”
- Fake Chemistry is nostalgia acting.

If you rated *Challengers* tennis-court heat, do not demand the same shape here. Same actor. Different assignment. That is the whole point of a performance scoreboard.`,
  },
  {
    kind: "stories",
    slug: "rate-the-supporting-cast-this-summer",
    title: "This summer’s supporting cast is doing the real work",
    description:
      "While leads dominate posters, August is a masterclass in supporting craft — from Odyssey gods to franchise chaos agents.",
    publishedAt: "2026-08-10",
    coverImage: COVER.odyssey,
    related: [
      { actorSlug: "lupita-nyongo", movieSlug: "the-odyssey-2026" },
      { actorSlug: "charlize-theron", movieSlug: "the-odyssey-2026" },
      { actorSlug: "tom-holland", movieSlug: "spider-man-brand-new-day-2026" },
    ],
    body: `Leads get the thinkpieces. Supporting turns decide whether those thinkpieces are about acting or marketing.

Rate Lupita’s mythic pressure. Rate Theron’s trap of desire. Rate whoever makes Holland’s Peter look lonelier without a monologue.

## ActorRating habit

Once a week, open three supporting scorecards before you touch a lead. It recalibrates what “presence” means when the camera isn’t begging for it.`,
  },
  {
    kind: "stories",
    slug: "odyssey-holdover-acting-not-gross",
    title: "The Odyssey is still playing — rate the holdover, not the cume",
    description:
      "Mid-August holdovers prove audiences are still sitting with Nolan’s cast. That’s a craft window, not a box-office footnote.",
    publishedAt: "2026-08-12",
    coverImage: COVER.odyssey,
    related: [
      { actorSlug: "matt-damon", movieSlug: "the-odyssey-2026" },
      { actorSlug: "tom-holland", movieSlug: "the-odyssey-2026" },
      { actorSlug: "zendaya", movieSlug: "the-odyssey-2026" },
    ],
    body: `Holdover weekends are when epic movies become acting labs. The event is over. The faces remain.

If you scored Damon/Holland/Zendaya in week one on awe, re-score on **stillness**. Myth ages differently when the crowd isn’t gasping at IMAX every five minutes.

## Prompt

Which Odyssey turn got *better* after the discourse cooled? That answer is usually the real performance.`,
  },
  {
    kind: "stories",
    slug: "two-billion-and-still-rate-the-turns",
    title: "$2 billion is not a performance score",
    description:
      "Brand New Day crossed $2B worldwide. Cool. Holland and Zendaya still need separate scorecards that ignore the milestone.",
    publishedAt: "2026-08-14",
    coverImage: COVER.bnd,
    related: [
      { actorSlug: "tom-holland", movieSlug: "spider-man-brand-new-day-2026" },
      { actorSlug: "zendaya", movieSlug: "spider-man-brand-new-day-2026" },
    ],
    body: `Historic grosses create a gravitational pull toward consensus. “It must be good acting — look at the money.”

No.

Money measures want. ActorRating measures craft under the five criteria. A $2B movie can contain a soft lead and a lethal supporting turn. A modest movie can contain a career-best.

## This weekend’s job

Open Peter. Open MJ. If your numbers moved because of the headline, put them back.`,
  },
  {
    kind: "stories",
    slug: "noah-wyle-the-pitt-and-tv-craft",
    title: "Noah Wyle’s The Pitt win is a craft reminder for film raters",
    description:
      "Astra TV Awards put The Pitt and Noah Wyle back in the spotlight. Television craft belongs on the same seriousness scale as film prestige.",
    publishedAt: "2026-08-15",
    coverImage: COVER.pitt,
    related: [
      { actorSlug: "noah-wyle", movieSlug: "er-1994" },
    ],
    body: `Awards nights compress seasons into a clip. The work was hour-by-hour stamina.

Whether or not *The Pitt* is on your ActorRating queue yet, the lesson transfers: **medical-drama precision is Technical Skill with blood pressure.** Emotional Range without triage honesty is soap.

## Carryover rule

If you only reserve “serious scores” for Nolan and awards films, your scoreboard is a prestige cosplay. Craft is craft on a streaming schedule too.`,
  },
  {
    kind: "stories",
    slug: "hathaway-disney-legend-and-penelope",
    title: "Disney Legend Hathaway still has a live Penelope score",
    description:
      "D23 made Anne Hathaway a Disney Legend. Fun. Her Odyssey Penelope is the adult acting problem still in theaters.",
    publishedAt: "2026-08-16",
    coverImage: COVER.odyssey,
    related: [
      { actorSlug: "anne-hathaway", movieSlug: "the-odyssey-2026" },
      { actorSlug: "anne-hathaway", movieSlug: "the-devil-wears-prada-2006" },
    ],
    body: `Career tributes flatten arcs into “beloved.” Scorecards refuse flattening.

Hathaway’s Andy Sachs and Mia Thermopolis are cultural furniture. Penelope is not. Rate the difference: **ornament vs strategy**, charm vs surveillance.

If your Odyssey score for her is mostly “I love Anne,” you rated the legend ceremony early.`,
  },
  {
    kind: "stories",
    slug: "venice-festival-acting-mode",
    title: "Venice is coming — switch into festival acting mode",
    description:
      "Late August means festival season. Before the premieres hit, practice rating performance without marketing language.",
    publishedAt: "2026-08-18",
    coverImage: COVER.substance,
    related: [
      { actorSlug: "demi-moore", movieSlug: "the-substance-2024" },
      { actorSlug: "emma-stone", movieSlug: "poor-things-2023" },
    ],
    body: `Festival mode is where people confuse “bold” with “good.” ActorRating’s five criteria exist to survive that fog.

Before Venice headlines arrive: practice on a demanding turn you already know — *The Substance*, *Poor Things*, a supporting knife-fight in a franchise film.

## Festival hygiene

- No invented awards destiny in the score
- No “important” as a criterion
- Yes to body, voice, listening, risk

The premieres will try to score themselves. Don’t let them.`,
  },
  {
    kind: "stories",
    slug: "bautista-kratos-physical-craft-casting",
    title: "Dave Bautista as Kratos is a physical craft casting story",
    description:
      "Prime Video’s God of War recast puts Bautista in Kratos. Before any footage, the acting question is already about body-as-instrument.",
    publishedAt: "2026-08-19",
    coverImage: COVER.darkKnight,
    related: [
      { actorSlug: "dave-bautista", movieSlug: "dune-2021" },
      { actorSlug: "dave-bautista", movieSlug: "blade-runner-2049-2017" },
    ],
    body: `Recasting after injury is logistics. Choosing Bautista is a thesis: **mythic rage needs weight that isn’t only CGI.**

We don’t rate unaired shows. We *do* prep the criteria: Screen Presence without smirk, Technical Skill as fight grammar, Emotional Range that isn’t only roar.

Look at Bautista’s quieter menace in *Dune* / *Blade Runner 2049* before you decide Kratos is “just a wrestler casting.” The body is the instrument. The question is whether he plays grief inside the instrument.`,
  },
  {
    kind: "stories",
    slug: "steven-yeun-pagans-after-beef",
    title: "Steven Yeun’s Pagans casting after Beef",
    description:
      "Yeun leads Netflix’s Pagans. After Beef, the anticipation isn’t fame — it’s whether he keeps choosing roles that punish easy likability.",
    publishedAt: "2026-08-20",
    coverImage: COVER.beef,
    related: [
      { actorSlug: "steven-yeun", movieSlug: "beef-2023" },
      { actorSlug: "steven-yeun", movieSlug: "minari-2020" },
    ],
    body: `*Beef* made Yeun’s volatility awards-visible. *Pagans* is a supernatural drama with a bidding-war pedigree — which usually means either a daring turn or a handsome fog machine.

## Anticipation, not scoring

We don’t invent numbers for unreleased work. We notice the pattern: Yeun keeps picking projects where **control and collapse** share a face (*Minari*, *Nope*, *Beef*).

When *Pagans* arrives, the scoreboard question writes itself: does he play power, or the cost of wearing it?`,
  },
  {
    kind: "stories",
    slug: "elordi-brolin-dog-stars-premiere",
    title: "Elordi & Brolin at The Dog Stars premiere — quiet lead energy",
    description:
      "Ridley Scott’s The Dog Stars premiered in London. Early talk centers chemistry between Jacob Elordi and Josh Brolin — a survivalist odd couple.",
    publishedAt: "2026-08-21",
    coverImage: COVER.odyssey,
    related: [
      { actorSlug: "jacob-elordi", movieSlug: "saltburn-2023" },
      { actorSlug: "josh-brolin", movieSlug: "dune-part-two-2024" },
    ],
    body: `Post-apocalyptic movies love noise. Early *Dog Stars* reactions keep mentioning something quieter: two men and a homestead grammar — Elordi’s Hig against Brolin’s Bangley.

## What to watch for (Aug 28 wide)

- Does Elordi play yearning without soft-boy default?
- Does Brolin’s hardness have listening, or only caliber?
- Is the dog a scene partner or a prop? (Yes, that matters for Chemistry.)

Premiere praise is weather. Opening weekend is when the scorecards open.`,
  },
  {
    kind: "stories",
    slug: "jimmy-olsen-mockumentary-acting-dare",
    title: "Skyler Gisondo’s Jimmy Olsen walks into a mockumentary dare",
    description:
      "HBO Max orders The People v. Gorilla Grodd — Gisondo’s Olsen investigating an ape murder trial. Comedy craft, DC world, serious scoreboard potential.",
    publishedAt: "2026-08-22",
    coverImage: COVER.challengers,
    related: [
      { actorSlug: "skyler-gisondo", movieSlug: "superman-2025" },
    ],
    body: `Mockumentary is a trap for comic-book characters. Play too broad and you’re a sketch. Play too straight and the format dies.

Gisondo’s Jimmy Olsen already proved earnest competence in *Superman*. This series asks whether that earnestness can survive **true-crime pastiche** without becoming a bit.

## Criteria to keep warm

- Technical Skill = documentary cadence without winking collapse
- Character Believability = reporter, not mascot
- Screen Presence = curiosity that holds an eight-episode case

Casting news isn’t a rating. It’s a promise to take comedy craft seriously when the episodes land.`,
  },
  {
    kind: "stories",
    slug: "dog-stars-quiet-lead-reactions",
    title: "The Dog Stars reactions: rate the quiet, not the genre costume",
    description:
      "First reactions call Scott’s film a surprise — more contemplative than dystopian default. That’s an acting brief for Elordi.",
    publishedAt: "2026-08-23",
    coverImage: COVER.odyssey,
    related: [
      { actorSlug: "jacob-elordi", movieSlug: "saltburn-2023" },
      { actorSlug: "josh-brolin", movieSlug: "no-country-for-old-men-2007" },
    ],
    body: `“Surprise” in genre usually means the movie refused the trailer’s volume. Good. That puts pressure on the lead to hold silence.

If Elordi’s Hig works, it will be because **stillness isn’t emptiness**. If it fails, it will be beautiful emptiness.

## Opening-week ActorRating plan (from Aug 28)

1. Rate Hig before you rate the world-building.
2. Rate Bangley as a separate moral weather system.
3. Leave a comment if the dog outperformed a human — we can take a joke that is also a craft observation.

Quiet leads are where scoreboards earn their keep.`,
  },

  // ——— NEWS ———
  {
    kind: "news",
    slug: "do-not-rate-opening-weekend-vibes",
    title: "Do not rate opening-weekend vibes",
    description:
      "Brand New Day week will tempt vibes-based scoring. Here’s the journal rule for event openings.",
    publishedAt: "2026-07-29",
    coverImage: COVER.bnd,
    related: [
      { actorSlug: "tom-holland", movieSlug: "spider-man-brand-new-day-2026" },
    ],
    body: `Opening weekend is a festival of false confidence.

People leave theaters certain. Certainty is not craft literacy. If your score would change after one rewatch of a quiet scene, it was a vibe.

## Journal rule

Quick-rate allowed. Publish-to-yourself allowed. Treat night-one numbers as drafts until you’ve named one concrete acting choice you scored.`,
  },
  {
    kind: "news",
    slug: "coming-soon-just-opened-what-changes",
    title: "Coming soon just opened — what changes on ActorRating",
    description:
      "When a title leaves Coming soon, aggregates become possible. That is a product event, not a hype event.",
    publishedAt: "2026-07-31",
    coverImage: COVER.bnd,
    related: [
      { actorSlug: "zendaya", movieSlug: "spider-man-brand-new-day-2026" },
    ],
    body: `Coming soon exists so trailer speculation cannot pose as community craft.

Unlock means:

- Real ratings can land
- Aggregates can form
- Lists and stories can point at live scorecards

Unlock does **not** mean the movie is “good now.” It means the scoreboard is honest enough to start.`,
  },
  {
    kind: "news",
    slug: "why-box-office-is-not-a-performance-score",
    title: "Why box office is not a performance score",
    description:
      "Grosses will scream this month. ActorRating’s five criteria do not take a cut of the ticket.",
    publishedAt: "2026-08-02",
    coverImage: COVER.bnd,
    related: [
      { actorSlug: "tom-holland", movieSlug: "spider-man-brand-new-day-2026" },
      { actorSlug: "matt-damon", movieSlug: "the-odyssey-2026" },
    ],
    body: `Box office answers: did people show up?

Performance scores answer: what did the actor do with the role?

Those questions share a poster and almost nothing else. A historic gross can contain a soft lead. A modest gross can contain a supporting knife-fight that rewires a film.

## Keep the rails clean

When you cite money in a rating comment, you are editorializing. Fine — just don’t pretend the number is the money.`,
  },
  {
    kind: "news",
    slug: "how-to-split-franchise-and-prestige-ratings",
    title: "How to split franchise and prestige ratings",
    description:
      "Holland and Zendaya just did both in one month. Here’s how not to blend the scorecards.",
    publishedAt: "2026-08-04",
    coverImage: COVER.odyssey,
    related: [
      { actorSlug: "tom-holland", movieSlug: "the-odyssey-2026" },
      { actorSlug: "tom-holland", movieSlug: "spider-man-brand-new-day-2026" },
      { actorSlug: "zendaya", movieSlug: "the-odyssey-2026" },
      { actorSlug: "zendaya", movieSlug: "spider-man-brand-new-day-2026" },
    ],
    body: `Same actors. Opposite machines.

Prestige asks for stillness and mythic temperature. Franchise asks for clarity under product pressure. Blending them into “Holland 2026” is how careers become soup.

## Method

1. Two films → two pages
2. Name the instinct each role punishes
3. Compare in prose, not in a single averaged number`,
  },
  {
    kind: "news",
    slug: "the-second-weekend-rating-trap",
    title: "The second-weekend rating trap",
    description:
      "Week-two discourse wants consensus. Your scorecard wants specificity. Pick one.",
    publishedAt: "2026-08-06",
    coverImage: COVER.bnd,
    related: [
      { actorSlug: "zendaya", movieSlug: "spider-man-brand-new-day-2026" },
    ],
    body: `Second weekends invent “the take.” Takes are contagious.

If your rating moves because a thread dunked on a scene you loved night one, you are rating the thread.

## Hygiene

Revisit one scene alone. Change the number only if the scene changed you — not if the timeline did.`,
  },
  {
    kind: "news",
    slug: "when-to-edit-your-first-score",
    title: "When to edit your first score",
    description:
      "Editing a rating isn’t weakness. Refusing to edit after new craft evidence is.",
    publishedAt: "2026-08-09",
    coverImage: COVER.challengers,
    related: [
      { actorSlug: "zendaya", movieSlug: "challengers-2024" },
    ],
    body: `First scores capture heat. Later scores capture literacy — if you allow them.

Edit when:

- You rewatched a quiet beat
- You separated Chemistry from Character Believability
- You realized you scored the movie’s theme, not the turn

Do not edit because a friend scored higher. That is peer pressure with a UI.`,
  },
  {
    kind: "news",
    slug: "comparing-performances-without-blending",
    title: "Comparing performances without blending them",
    description:
      "Comparison is allowed. Fusion is not. Here’s the journal method.",
    publishedAt: "2026-08-11",
    coverImage: COVER.darkKnight,
    related: [
      { actorSlug: "heath-ledger", movieSlug: "the-dark-knight-2008" },
      { actorSlug: "joaquin-phoenix", movieSlug: "joker-2019" },
    ],
    body: `“Who was better?” is a bar argument. ActorRating wants a better verb: **different how?**

Keep two scorecards open. Write one sentence about the instinct each role forbids. Then argue.

Blended scores hide the argument. Separate scores make the argument visible.`,
  },
  {
    kind: "news",
    slug: "mid-august-scoreboard-hygiene",
    title: "Mid-August scoreboard hygiene",
    description:
      "A short checklist for keeping ActorRating useful while summer event movies dominate the air.",
    publishedAt: "2026-08-13",
    coverImage: COVER.odyssey,
    related: [
      { actorSlug: "matt-damon", movieSlug: "the-odyssey-2026" },
    ],
    body: `Mid-August checklist:

1. Revisit one Odyssey score without reading discourse first
2. Open one Brand New Day supporting card
3. Rate one older performance so the board isn’t only 2026
4. Delete (or edit) any score you can’t defend with a criterion

Hygiene is how a scoreboard stays a scoreboard.`,
  },
  {
    kind: "news",
    slug: "awards-season-is-not-a-rating-guide",
    title: "Awards season is not a rating guide",
    description:
      "Astra trophies and festival buzz will ramp up. They are signal — not a substitute for the five criteria.",
    publishedAt: "2026-08-15",
    coverImage: COVER.pitt,
    related: [
      { actorSlug: "steven-yeun", movieSlug: "beef-2023" },
    ],
    body: `Awards compress seasons into a night. Ratings should refuse compression.

Use awards as discovery (“I should watch that turn”). Do not use them as auto-fill for Emotional Range.

If a winner’s clip package does the acting for you, your score is still unfinished.`,
  },
  {
    kind: "news",
    slug: "casting-news-vs-rateable-turns",
    title: "Casting news vs rateable turns",
    description:
      "Bautista as Kratos, Yeun in Pagans, Grodd on HBO Max — exciting. None of that is a rating yet.",
    publishedAt: "2026-08-17",
    coverImage: COVER.beef,
    related: [
      { actorSlug: "steven-yeun", movieSlug: "beef-2023" },
      { actorSlug: "dave-bautista", movieSlug: "dune-2021" },
    ],
    body: `Casting announcements are promises. Ratings are receipts.

ActorRating Stories can talk about the promise — physical craft, typecasting risk, what prior turns suggest. News reminds you: **no invented scores for unaired work.**

When the episodes and films unlock, the scoreboard opens. Until then, curiosity is free and numbers are not.`,
  },
  {
    kind: "news",
    slug: "physicality-is-a-criterion-not-a-stunt",
    title: "Physicality is a criterion, not a stunt",
    description:
      "As God of War recasting talk centers the body, remember: Technical Skill includes fight grammar and stillness under weight.",
    publishedAt: "2026-08-19",
    coverImage: COVER.substance,
    related: [
      { actorSlug: "demi-moore", movieSlug: "the-substance-2024" },
      { actorSlug: "dave-bautista", movieSlug: "blade-runner-2049-2017" },
    ],
    body: `People treat physical performance like a behind-the-scenes featurette. On ActorRating it lives under **Technical Skill** and **Screen Presence** — sometimes Emotional Range when the body carries grief.

Bulk is not acting. Control is. Exhaustion that reads as character is. Stunt spectacle that reads as montage usually isn’t.

When a casting story sells “he bulked up,” translate it into criteria before you get excited.`,
  },
  {
    kind: "news",
    slug: "what-casting-announcements-dont-tell-you",
    title: "What casting announcements don’t tell you",
    description:
      "A lead attach changes the market. It does not tell you how the performance will fail or succeed.",
    publishedAt: "2026-08-20",
    coverImage: COVER.beef,
    related: [
      { actorSlug: "steven-yeun", movieSlug: "minari-2020" },
    ],
    body: `Announcements tell you: who signed, who produces, which platform won a bidding war.

They do not tell you: listening, timing, whether the role punishes the actor’s brand, whether the edit will protect or expose them.

## Journal practice

For every casting headline, write one sentence: “The risk is ___.” If you can’t name a risk, you’re reading marketing, not craft.`,
  },
  {
    kind: "news",
    slug: "premiere-reactions-are-not-aggregates",
    title: "Premiere reactions are not aggregates",
    description:
      "The Dog Stars London reactions are useful weather. They are not a community craft score.",
    publishedAt: "2026-08-22",
    coverImage: COVER.odyssey,
    related: [
      { actorSlug: "jacob-elordi", movieSlug: "saltburn-2023" },
    ],
    body: `Premiere reactions are written in a sugar high: travel, lights, free drinks, the need to post first.

ActorRating aggregates require logged-in ratings on unlocked titles. Different species.

Use reactions to decide what to watch. Use scorecards to decide what the acting did.`,
  },
  {
    kind: "news",
    slug: "how-we-keep-the-journal-fresh",
    title: "How we keep the journal fresh",
    description:
      "Stories carry heat. News keeps rules legible. Starting now, ActorRating also publishes a daily journal pulse by default.",
    publishedAt: "2026-08-23",
    coverImage: COVER.challengers,
    related: [
      { actorSlug: "zendaya", movieSlug: "challengers-2024" },
    ],
    body: `The gap after a big release week is how sites go quiet — and quiet is how scoreboards feel abandoned.

We’re tightening the cadence:

- **Stories** for timely performance features
- **News** for criteria, product philosophy, and craft hygiene
- A **daily journal job** that keeps both rails moving even when there isn’t a $2B headline

If a day produces nothing worth saying, we’d rather publish less than invent a fake event. Craft over calendar filler — but the calendar will not go dark by accident again.`,
  },
]

function main() {
  const root = path.join(process.cwd(), "content")
  let written = 0
  let skipped = 0
  for (const p of pieces) {
    const dir = path.join(root, p.kind)
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, `${p.slug}.md`)
    if (fs.existsSync(file)) {
      skipped += 1
      continue
    }
    fs.writeFileSync(file, fm(p), "utf8")
    written += 1
    console.log(`wrote ${p.kind}/${p.slug}.md (${p.publishedAt})`)
  }
  console.log(`\nDone. wrote=${written} skipped=${skipped} total=${pieces.length}`)
}

main()
