/**
 * Helper utilities for working with slugs in the application
 * Provides safe access to slug fields and URL generation
 */

import { createActorSlug, createMovieSlug } from './createSlug'

export interface Actor {
  id: string
  name: string
  slug?: string | null
}

export interface Movie {
  id: string
  title: string
  year: number
  slug?: string | null
}

/**
 * Get the slug for an actor, or generate one from the name
 * This ensures we always have a slug to use in URLs
 */
export function getActorSlugOrGenerate(actor: Actor): string {
  return actor.slug || createActorSlug(actor.name)
}

/**
 * Get the slug for a movie, or generate one from title and year
 * This ensures we always have a slug to use in URLs
 */
export function getMovieSlugOrGenerate(movie: Movie): string {
  return movie.slug || createMovieSlug(movie.title, movie.year)
}

/**
 * Generate an actor page URL
 * Always uses slug, generates one if not available
 */
export function getActorUrl(actor: Actor): string {
  const slug = getActorSlugOrGenerate(actor)
  return `/actors/${slug}`
}

/**
 * Generate a movie page URL
 * Always uses slug, generates one if not available
 */
export function getMovieUrl(movie: Movie): string {
  const slug = getMovieSlugOrGenerate(movie)
  return `/movies/${slug}`
}

/**
 * Generate a rate page URL.
 * Uses slug when present (pretty URLs); falls back to id when slug is null so the rate page can resolve.
 */
export function getRateUrl(actor: Actor, movie: Movie): string {
  const movieSlugOrId = movie.slug ?? movie.id
  const actorSlugOrId = actor.slug ?? actor.id
  return `/rate/${movieSlugOrId}/${actorSlugOrId}`
}

