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
 * Generate a rate page URL
 * Always prefers new slug-based format, generates slugs on-the-fly if needed
 */
export function getRateUrl(actor: Actor, movie: Movie): string {
  // Use slug generation helpers to ensure correct format
  const actorSlugOrId = getActorSlugOrGenerate(actor)
  const movieSlugOrId = getMovieSlugOrGenerate(movie)
  
  return `/rate/${movieSlugOrId}/${actorSlugOrId}`
}

