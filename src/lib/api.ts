import { Actor, Movie, Performance, Rating, PerformanceRating, SearchResult } from '@/types'

const API_BASE = '/api'

class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }))
    throw new ApiError(response.status, error.error || 'Request failed')
  }

  return response.json()
}

// Performances API
export const performancesApi = {
  getAll: () => fetchApi<Performance[]>('/performances'),
  
  getById: (id: string) => fetchApi<Performance>(`/performances/${id}`),
  
  create: (data: {
    actorId: string
    movieId: string
    recaptchaToken: string
  } & PerformanceRating) => 
    fetchApi<Performance>('/performances', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: Partial<PerformanceRating>) =>
    fetchApi<Performance>(`/performances/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  
  delete: (id: string) =>
    fetchApi<void>(`/performances/${id}`, {
      method: 'DELETE',
    }),
}

// Actors API
export const actorsApi = {
  getAll: () => fetchApi<Actor[]>('/actors'),
  
  getById: (id: string) => fetchApi<Actor>(`/actors/${id}`),
  
  search: (query: string) => fetchApi<Actor[]>(`/actors/search?q=${encodeURIComponent(query)}`),
  
  create: (data: Partial<Actor>) =>
    fetchApi<Actor>('/actors', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// Movies API
export const moviesApi = {
  getAll: () => fetchApi<Movie[]>('/movies'),
  
  getById: (id: string) => fetchApi<Movie>(`/movies/${id}`),
  
  search: (query: string) => fetchApi<Movie[]>(`/movies/search?q=${encodeURIComponent(query)}`),
  
  create: (data: Partial<Movie>) =>
    fetchApi<Movie>('/movies', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
}

// Ratings API
export const ratingsApi = {
  getAll: () => fetchApi<Rating[]>('/ratings'),
  
  getById: (id: string) => fetchApi<Rating>(`/ratings/${id}`),
  
  create: (data: {
    actorId: string
    movieId: string
    recaptchaToken: string
  } & PerformanceRating) =>
    fetchApi<Rating>('/ratings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  
  update: (id: string, data: Partial<PerformanceRating>) =>
    fetchApi<Rating>(`/ratings/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
}

// Search API
export const searchApi = {
  global: (query: string) => 
    fetchApi<SearchResult>(`/search?q=${encodeURIComponent(query)}`),
}

export { ApiError } 

// Suggestions API
export const suggestionsApi = {
  getPerformances: () => fetchApi<{ items: Array<{
    id: string
    actorId: string
    movieId: string
    ratingsCount: number
    comment?: string | null
    actor: { id: string; name: string; imageUrl: string | null }
    movie: { id: string; title: string; year: number; director: string | null }
  }> }>(`/suggestions/performances`, { cache: 'no-store' }),
}