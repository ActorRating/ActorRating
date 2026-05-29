/**
 * Homepage hero: one featured performance per calendar week (UTC).
 * Anchor Monday 2025-01-06 — index advances every 7 days for social + SEO freshness.
 */

export type WeeklyHeroConfig = {
  actor: string
  movie: string
  year: string
  /** Primary H1 — a question that invites an opinion */
  headline: string
  /** Brief five-criteria explainer under the headline */
  subline: string
}

/** Order matters: slot = weekIndex % length */
export const WEEKLY_HERO_ROTATION: WeeklyHeroConfig[] = [
  {
    actor: 'Heath Ledger',
    movie: 'The Dark Knight',
    year: '2008',
    headline: "How do you rate Heath Ledger's Joker?",
    subline:
      'One quick score—or five Oscar-inspired dimensions: emotional range, believability, technical skill, screen presence, and chemistry.',
  },
  {
    actor: 'Cillian Murphy',
    movie: 'Oppenheimer',
    year: '2023',
    headline: 'How do you rate Cillian Murphy in Oppenheimer?',
    subline:
      'One quick score—or five Oscar-inspired dimensions: emotional range, believability, technical skill, screen presence, and chemistry.',
  },
  {
    actor: 'Joaquin Phoenix',
    movie: 'Joker',
    year: '2019',
    headline: "How do you rate Joaquin Phoenix's Joker?",
    subline:
      'One quick score—or five Oscar-inspired dimensions: emotional range, believability, technical skill, screen presence, and chemistry.',
  },
  {
    actor: 'Margot Robbie',
    movie: 'Barbie',
    year: '2023',
    headline: 'How do you rate Margot Robbie in Barbie?',
    subline:
      'One quick score—or five Oscar-inspired dimensions: emotional range, believability, technical skill, screen presence, and chemistry.',
  },
  {
    actor: 'Anthony Hopkins',
    movie: 'The Silence of the Lambs',
    year: '1991',
    headline: 'How do you rate Anthony Hopkins as Hannibal Lecter?',
    subline:
      'One quick score—or five Oscar-inspired dimensions: emotional range, believability, technical skill, screen presence, and chemistry.',
  },
  {
    actor: 'Leonardo DiCaprio',
    movie: 'The Wolf of Wall Street',
    year: '2013',
    headline: 'How do you rate Leonardo DiCaprio in The Wolf of Wall Street?',
    subline:
      'One quick score—or five Oscar-inspired dimensions: emotional range, believability, technical skill, screen presence, and chemistry.',
  },
  {
    actor: 'Robert De Niro',
    movie: 'Taxi Driver',
    year: '1976',
    headline: 'How do you rate Robert De Niro in Taxi Driver?',
    subline:
      'One quick score—or five Oscar-inspired dimensions: emotional range, believability, technical skill, screen presence, and chemistry.',
  },
  {
    actor: 'Al Pacino',
    movie: 'The Godfather Part II',
    year: '1974',
    headline: 'How do you rate Al Pacino in The Godfather Part II?',
    subline:
      'One quick score—or five Oscar-inspired dimensions: emotional range, believability, technical skill, screen presence, and chemistry.',
  },
]

const WEEK_MS = 7 * 24 * 60 * 60 * 1000
/** Monday UTC anchor for week index 0 = first entry in WEEKLY_HERO_ROTATION */
const ROTATION_EPOCH_UTC = Date.UTC(2025, 0, 6)

export function getWeeklyHeroWeekIndex(date: Date = new Date()): number {
  const t = date.getTime()
  if (t < ROTATION_EPOCH_UTC) return 0
  return Math.floor((t - ROTATION_EPOCH_UTC) / WEEK_MS)
}

export function getCurrentWeeklyHeroConfig(date: Date = new Date()): WeeklyHeroConfig {
  const idx = getWeeklyHeroWeekIndex(date) % WEEKLY_HERO_ROTATION.length
  return WEEKLY_HERO_ROTATION[idx]
}

export function weeklyHeroLookupTarget(date?: Date): { actor: string; movie: string } {
  const { actor, movie } = getCurrentWeeklyHeroConfig(date)
  return { actor, movie }
}
