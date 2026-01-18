export interface Award {
  title?: string
  award?: string
  year?: number
  category?: string
  result?: 'won' | 'nominated'
  movie?: string
}

export interface Actor {
  id: string
  name: string
  slug?: string | null
  bio?: string
  imageUrl?: string
  birthDate?: string
  nationality?: string
  tmdbId?: number
  knownFor?: string
  awards?: Award[] | string | null
  performances?: Performance[]
  ratings?: Rating[]
  createdAt: string
  updatedAt: string
}

export interface Movie {
  id: string
  title: string
  slug?: string | null
  year: number
  director?: string
  genre?: string
  tmdbId?: number
  overview?: string
  performances?: Performance[]
  ratings?: Rating[]
  createdAt: string
  updatedAt: string
}

export interface Performance {
  id: string
  userId: string
  actorId: string
  movieId: string
  roleName?: string | null
  character?: string | null
  emotionalRangeDepth: number
  characterBelievability: number
  technicalSkill: number
  screenPresence: number
  chemistryInteraction: number
  comment?: string
  user?: {
    name?: string
    email?: string
  }
  actor?: {
    name: string
    imageUrl?: string
  }
  movie?: {
    title: string
    year: number
    director?: string
  }
  createdAt: string
  updatedAt: string
}

export interface Rating {
  id: string
  userId: string
  actorId: string
  movieId: string
  emotionalRangeDepth: number
  characterBelievability: number
  technicalSkill: number
  screenPresence: number
  chemistryInteraction: number
  weightedScore: number
  comment?: string
  user?: {
    name?: string
    email?: string
  }
  actor?: {
    name: string
    imageUrl?: string
  }
  movie?: {
    title: string
    year: number
    director?: string
  }
  createdAt: string
  updatedAt: string
}

export interface PerformanceRating {
  emotionalRangeDepth: number
  characterBelievability: number
  technicalSkill: number
  screenPresence: number
  chemistryInteraction: number
  comment?: string
  recaptchaToken?: string
}

// Export all rating types
export * from './rating'

export interface SearchResult {
  actors: Actor[]
  movies: Movie[]
  performances: Performance[]
}

// New search result types for the updated API
export interface SearchMovie {
  id: string
  title: string
  slug?: string | null
  year: number
}

export interface SearchActor {
  id: string
  name: string
  slug?: string | null
}

export interface NewSearchResult {
  movies: SearchMovie[]
  actors: SearchActor[]
} 

export interface SharePayload {
  feedUrl: string
  storyUrl: string
  ogUrl: string
  pageUrl: string
  shortUrl: string
}