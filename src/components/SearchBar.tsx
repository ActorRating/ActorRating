"use client"

import { useState, useEffect, useCallback, useRef, useMemo, useLayoutEffect } from 'react'
import { flushSync, createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NewSearchResult } from '@/types'
import { PrefetchLink } from '@/components/ui/PrefetchLink'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'
import { fadeInUp, staggerContainer, getIsMobile, getPrefersReducedMotion } from '@/lib/animations'
import { getActorUrl, getMovieUrl } from '@/lib/slugHelper'

const DEBOUNCE_MS = 300
const MAX_SUGGESTIONS = 8
const LOCAL_LIMIT = 4

/** Preload shape for inline autocomplete and instant dropdown. */
type PreloadData = {
  actors: Array<{ id: string; name: string; slug: string | null; imageUrl?: string | null }>
  movies: Array<{ id: string; title: string; slug: string | null; year: number; posterUrl?: string | null }>
}
/** Normalized for instant local filter (no per-keystroke toLowerCase). */
type NormalizedPreload = {
  actors: Array<{ id: string; name: string; slug: string | null; imageUrl?: string | null; _name: string }>
  movies: Array<{ id: string; title: string; slug: string | null; year: number; posterUrl?: string | null; _title: string }>
}
let preloadCache: PreloadData | null = null
let normalizedPreloadCache: NormalizedPreload | null = null

// Inline lightweight icons to avoid bundling external icon libraries in server/vendor chunks
const IconSearch = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const IconX = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const IconUser = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
)

const IconFilm = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
    <path d="M7 2v20M17 2v20M2 12h20" />
  </svg>
)

interface SearchBarProps {
  placeholder?: string
  className?: string
  onSearch?: (query: string) => void
  initialValue?: string
  showClear?: boolean
  autoFocus?: boolean
  showSuggestions?: boolean
  /** When true, do not scroll the page on input focus/click (e.g. on dedicated search page). */
  disableAutoScrollOnFocus?: boolean
}

export function SearchBar({
  placeholder = "Search for actors and movies...",
  className = "",
  onSearch,
  initialValue = "",
  showClear = true,
  autoFocus = false,
  showSuggestions = true,
  disableAutoScrollOnFocus = false,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue)
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<NewSearchResult | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [navigating, setNavigating] = useState(false)
  const [preload, setPreload] = useState<PreloadData | null>(preloadCache)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastQueryRef = useRef<string>("")
  const [reduceMotion, setReduceMotion] = useState(false)
  useEffect(() => {
    const check = () => setReduceMotion(getIsMobile() || getPrefersReducedMotion())
    check()
    window.addEventListener('resize', check)
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    mq.addEventListener('change', check)
    return () => { window.removeEventListener('resize', check); mq.removeEventListener('change', check) }
  }, [])

  const isEmptyQuery = query.trim().length === 0
  const hasDiscovery = Boolean(preload && (preload.actors?.length > 0 || preload.movies?.length > 0))
  const showDropdown = isFocused && showSuggestions && (query.trim().length >= 1 || (isEmptyQuery && hasDiscovery))

  // Preload: inline autocomplete + instant dropdown. Check global (e.g. from layout) then fetch once.
  const ensurePreload = useCallback(() => {
    if (preloadCache) {
      setPreload(preloadCache)
      return
    }
    const fromGlobal =
      typeof window !== "undefined" && (window as unknown as { __SEARCH_PRELOAD__?: PreloadData }).__SEARCH_PRELOAD__
    if (fromGlobal) {
      preloadCache = fromGlobal
      normalizedPreloadCache = {
        actors: fromGlobal.actors.map((a) => ({ ...a, _name: a.name.toLowerCase() })),
        movies: fromGlobal.movies.map((m) => ({ ...m, _title: m.title.toLowerCase() })),
      }
      setPreload(fromGlobal)
      return
    }
    fetch("/api/search/preload")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: PreloadData | null) => {
        if (!d) return
        preloadCache = d
        normalizedPreloadCache = {
          actors: d.actors.map((a) => ({ ...a, _name: a.name.toLowerCase() })),
          movies: d.movies.map((m) => ({ ...m, _title: m.title.toLowerCase() })),
        }
        setPreload(d)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    ensurePreload()
  }, [ensurePreload])

  // Inline autocomplete: prefer exact match (e.g. "chris evans" → Chris Evans), else first prefix match from preload.
  const inlineCompletionMatch = useMemo(() => {
    const q = query.trim().toLowerCase().replace(/\s+/g, ' ')
    if (!q || !preload) return null
    const nameNorm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ')
    const qPrefix = query.trim().toLowerCase()
    for (const a of preload.actors) {
      if (nameNorm(a.name) === q) return { type: "actor" as const, item: a }
    }
    for (const m of preload.movies) {
      if (nameNorm(m.title) === q) return { type: "movie" as const, item: m }
    }
    for (const a of preload.actors) {
      if (a.name.toLowerCase().startsWith(qPrefix)) return { type: "actor" as const, item: a }
    }
    for (const m of preload.movies) {
      if (m.title.toLowerCase().startsWith(qPrefix)) return { type: "movie" as const, item: m }
    }
    return null
  }, [query, preload])

  const inlineCompletionText = inlineCompletionMatch
    ? inlineCompletionMatch.type === "actor"
      ? inlineCompletionMatch.item.name
      : inlineCompletionMatch.item.title
    : null

  // Only show inline completion when query has no leading/trailing space and query is non-empty (disabled in discovery mode).
  const showInlineCompletion =
    isFocused &&
    !isEmptyQuery &&
    query === query.trim() &&
    inlineCompletionText !== null &&
    query.trim().length > 0 &&
    query.trim().toLowerCase() === inlineCompletionText.slice(0, query.trim().length).toLowerCase()
  const inlineSuffix = showInlineCompletion ? inlineCompletionText!.slice(query.trim().length) : ""

  // Measure query width so gray suffix starts exactly after typed text (no overlap)
  const measureRef = useRef<HTMLSpanElement>(null)
  const [queryWidthPx, setQueryWidthPx] = useState(0)
  useLayoutEffect(() => {
    if (!showInlineCompletion || !inlineSuffix) {
      setQueryWidthPx(0)
      return
    }
    const input = inputRef.current
    const measure = measureRef.current
    if (!input || !measure) return
    const s = getComputedStyle(input)
    measure.style.font = s.font
    measure.style.letterSpacing = s.letterSpacing
    setQueryWidthPx(measure.offsetWidth)
  }, [showInlineCompletion, inlineSuffix, query])

  // Discovery mode: when query is empty and focused, show top 5 actors + top 5 movies from preload. No API, no debounce.
  // Non-empty: instant local filter from preload, then after debounce replace with server suggestions.
  useEffect(() => {
    const raw = query.trim()
    if (raw.length === 0) {
      if (preload && (preload.actors?.length > 0 || preload.movies?.length > 0)) {
        setSuggestions({
          actors: preload.actors.slice(0, 5),
          movies: preload.movies.slice(0, 5),
        })
        setHighlightedIndex(-1)
      } else {
        setSuggestions(null)
        setHighlightedIndex(-1)
      }
      return
    }

    const term = raw.toLowerCase()
    const tokens = term.split(/\s+/).filter(Boolean)
    const allTokensIn = (normalized: string) =>
      tokens.length === 0 ? false : tokens.every((t) => normalized.includes(t))
    const score = (normalized: string): number => {
      if (normalized.startsWith(term)) return 0
      if (tokens.length > 0 && tokens.every((t) => normalized.split(/\s+/).some((w) => w.startsWith(t)))) return 1
      if (normalized.includes(term)) return 2
      if (allTokensIn(normalized)) return 3
      return 99
    }

    if (normalizedPreloadCache) {
      const actors = normalizedPreloadCache.actors
        .filter((a) => score(a._name) < 99)
        .sort((a, b) => score(a._name) - score(b._name))
        .slice(0, LOCAL_LIMIT)
        .map(({ _name, ...a }) => a)
      const movies = normalizedPreloadCache.movies
        .filter((m) => score(m._title) < 99)
        .sort((a, b) => score(a._title) - score(b._title))
        .slice(0, LOCAL_LIMIT)
        .map(({ _title, ...m }) => m)
      setSuggestions({ actors, movies })
    }

    // Only call API when query length >= 2 (avoids many single-char requests)
    if (raw.length < 2) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null
      const q = raw
      lastQueryRef.current = q
      fetch(`/api/search/suggestions?q=${encodeURIComponent(q)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: NewSearchResult | null) => {
          if (!d || lastQueryRef.current !== q) return
          setSuggestions({ actors: d.actors ?? [], movies: d.movies ?? [] })
          setHighlightedIndex(-1)
        })
        .catch(() => {
          if (lastQueryRef.current === q) setSuggestions((prev) => prev ?? { actors: [], movies: [] })
        })
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, showSuggestions, preload])

  // When suggestions change: reset highlight to 0 or preserve by ID when results only reorder
  const prevSuggestionsRef = useRef<NewSearchResult | null>(null)
  const highlightedIndexRef = useRef(highlightedIndex)
  highlightedIndexRef.current = highlightedIndex
  useEffect(() => {
    const prev = prevSuggestionsRef.current
    prevSuggestionsRef.current = suggestions ?? null
    const actors = suggestions?.actors ?? []
    const movies = suggestions?.movies ?? []
    const totalItems = actors.length + movies.length
    if (totalItems === 0) {
      setHighlightedIndex(-1)
      return
    }
    const newIds = [...actors.map((a) => a.id), ...movies.map((m) => m.id)]
    const prevHighlighted = highlightedIndexRef.current
    if (prev && prevHighlighted >= 0) {
      const prevActors = prev.actors ?? []
      const prevMovies = prev.movies ?? []
      const prevIds = [...prevActors.map((a) => a.id), ...prevMovies.map((m) => m.id)]
      const prevId = prevIds[prevHighlighted]
      if (prevId && newIds.includes(prevId)) {
        setHighlightedIndex(newIds.indexOf(prevId))
        return
      }
    }
    setHighlightedIndex(0)
  }, [suggestions])

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.querySelector(`[data-highlight-index="${highlightedIndex}"]`)
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
    }
  }, [highlightedIndex])

  // Prefetch the inline autocomplete target so Enter navigates instantly
  useEffect(() => {
    if (!showInlineCompletion || !inlineCompletionMatch) return
    const url = inlineCompletionMatch.type === 'actor'
      ? getActorUrl(inlineCompletionMatch.item)
      : getMovieUrl(inlineCompletionMatch.item)
    try {
      if (typeof router.prefetch === 'function') router.prefetch(url)
    } catch {}
  }, [showInlineCompletion, inlineCompletionMatch, router])

  // Prefetch first or highlighted suggestion so Enter is instant (keyboard users don't trigger PrefetchLink)
  useEffect(() => {
    if (!showDropdown || !suggestions) return
    const actors = suggestions.actors?.slice(0, 10) ?? []
    const movies = suggestions.movies?.slice(0, 10) ?? []
    const total = actors.length + movies.length
    if (total === 0) return
    const index = highlightedIndex >= 0 && highlightedIndex < total ? highlightedIndex : 0
    const item =
      index < actors.length
        ? { type: 'actor' as const, item: actors[index] }
        : { type: 'movie' as const, item: movies[index - actors.length] }
    const url = item.type === 'actor' ? getActorUrl(item.item) : getMovieUrl(item.item)
    try {
      if (typeof router.prefetch === 'function') router.prefetch(url)
    } catch {}
  }, [showDropdown, suggestions, highlightedIndex, router])

  // Close dropdown when clicking outside (dropdown visibility is driven by isFocused)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsFocused(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleClear = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault()
      e.stopPropagation()
    }
    setQuery('')
    setSuggestions(null)
    setHighlightedIndex(-1)
    if (onSearch) {
      onSearch('')
    }
    inputRef.current?.focus()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const displayed = suggestions
    const actors = displayed?.actors?.slice(0, 10) || []
    const movies = displayed?.movies?.slice(0, 10) || []
    const allItems = [...actors.map(a => ({ type: 'actor' as const, item: a })), ...movies.map(m => ({ type: 'movie' as const, item: m }))]
    const q = query.trim().toLowerCase().replace(/\s+/g, ' ')

    // Direct match: if query exactly matches an actor or movie (case-insensitive, spaces normalized), show full name then navigate
    if (q && allItems.length > 0) {
      const exact = allItems.find(({ type, item }) => {
        const name = (type === 'actor' ? item.name : item.title).toLowerCase().replace(/\s+/g, ' ')
        return name === q
      })
      if (exact) {
        const fullText = exact.type === 'actor' ? exact.item.name : exact.item.title
        const url = exact.type === 'actor' ? getActorUrl(exact.item) : getMovieUrl(exact.item)
        flushSync(() => {
          setQuery(fullText)
          setIsFocused(false)
          setSuggestions(null)
          setHighlightedIndex(-1)
          setNavigating(true)
        })
        router.push(url)
        return
      }
    }

    // If we have suggestions and a highlighted one, show full name and bouncing balls immediately, then navigate
    if (allItems.length > 0 && highlightedIndex >= 0 && highlightedIndex < allItems.length) {
      const selected = allItems[highlightedIndex]
      const fullText = selected.type === 'actor' ? selected.item.name : selected.item.title
      const url = selected.type === 'actor' ? getActorUrl(selected.item) : getMovieUrl(selected.item)
      flushSync(() => {
        setQuery(fullText)
        setIsFocused(false)
        setSuggestions(null)
        setHighlightedIndex(-1)
        setNavigating(true)
      })
      router.push(url)
      return
    }

    // Typing + Enter with no arrow selection: prefer exact match (e.g. "inception" → Inception movie), else first suggestion
    if (allItems.length > 0 && highlightedIndex < 0) {
      const exactOrFirst = allItems.find(({ type, item }) => {
        const name = (type === 'actor' ? item.name : item.title).toLowerCase().replace(/\s+/g, ' ')
        return name === q
      }) ?? allItems[0]
      const selected = exactOrFirst
      const fullText = selected.type === 'actor' ? selected.item.name : selected.item.title
      const url = selected.type === 'actor' ? getActorUrl(selected.item) : getMovieUrl(selected.item)
      flushSync(() => {
        setQuery(fullText)
        setIsFocused(false)
        setSuggestions(null)
        setHighlightedIndex(-1)
        setNavigating(true)
      })
      router.push(url)
      return
    }

    // No suggestions yet (e.g. Enter before API responded): try exact then token match from preload so "inception" / "chris evans" go straight to page
    if (query.trim() && allItems.length === 0 && preload) {
      const qNorm = q
      const tokens = qNorm.split(/\s+/).filter(Boolean)
      const nameNorm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ')
      const allTokensIn = (norm: string) => tokens.length > 0 && tokens.every((t) => norm.includes(t))

      // Exact match first
      let movieMatch = preload.movies.filter((m) => nameNorm(m.title) === qNorm)
      let actorMatch = preload.actors.filter((a) => nameNorm(a.name) === qNorm)
      // If no exact match, try token match (e.g. "chris evans" → actor whose name contains both "chris" and "evans")
      if (actorMatch.length === 0 && movieMatch.length === 0 && tokens.length > 0) {
        const actorsWithTokens = preload.actors.filter((a) => allTokensIn(nameNorm(a.name)))
        const moviesWithTokens = preload.movies.filter((m) => allTokensIn(nameNorm(m.title)))
        if (actorsWithTokens.length === 1 || moviesWithTokens.length === 1) {
          actorMatch = actorsWithTokens.length === 1 ? actorsWithTokens : []
          movieMatch = moviesWithTokens.length === 1 ? moviesWithTokens : []
        } else if (actorsWithTokens.length > 0 || moviesWithTokens.length > 0) {
          const exactActor = actorsWithTokens.find((a) => nameNorm(a.name) === qNorm)
          const exactMovie = moviesWithTokens.find((m) => nameNorm(m.title) === qNorm)
          if (exactActor) actorMatch = [exactActor]
          else if (exactMovie) movieMatch = [exactMovie]
          else if (actorsWithTokens.length > 0) actorMatch = [actorsWithTokens[0]]
          else movieMatch = [moviesWithTokens[0]]
        }
      }

      const singleMovie = movieMatch.length === 1 ? movieMatch[0] : null
      const singleActor = actorMatch.length === 1 ? actorMatch[0] : null
      if (singleMovie) {
        flushSync(() => {
          setQuery(singleMovie.title)
          setIsFocused(false)
          setSuggestions(null)
          setHighlightedIndex(-1)
          setNavigating(true)
        })
        router.push(getMovieUrl(singleMovie))
        return
      }
      if (singleActor) {
        flushSync(() => {
          setQuery(singleActor.name)
          setIsFocused(false)
          setSuggestions(null)
          setHighlightedIndex(-1)
          setNavigating(true)
        })
        router.push(getActorUrl(singleActor))
        return
      }
      if (movieMatch.length > 0) {
        const m = movieMatch[0]
        flushSync(() => {
          setQuery(m.title)
          setIsFocused(false)
          setSuggestions(null)
          setHighlightedIndex(-1)
          setNavigating(true)
        })
        router.push(getMovieUrl(m))
        return
      }
      if (actorMatch.length > 0) {
        const a = actorMatch[0]
        flushSync(() => {
          setQuery(a.name)
          setIsFocused(false)
          setSuggestions(null)
          setHighlightedIndex(-1)
          setNavigating(true)
        })
        router.push(getActorUrl(a))
        return
      }
    }

    // No suggestions and no preload match: show loader and try API once so "josh brolin" etc. still go straight to page
    if (query.trim() && allItems.length === 0) {
      setHighlightedIndex(-1)
      if (onSearch) {
        onSearch(query.trim())
        return
      }
      const searchQuery = query.trim()
      flushSync(() => setNavigating(true))
      fetch(`/api/search/suggestions?q=${encodeURIComponent(searchQuery)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: NewSearchResult | null) => {
          if (!data) {
            router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
            return
          }
          const qNorm = searchQuery.toLowerCase().replace(/\s+/g, ' ')
          const nameNorm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ')
          const actors = data.actors ?? []
          const movies = data.movies ?? []
          const exactActor = actors.find((a) => nameNorm(a.name) === qNorm)
          const exactMovie = movies.find((m) => nameNorm(m.title) === qNorm)
          if (exactActor) {
            router.push(getActorUrl(exactActor))
            return
          }
          if (exactMovie) {
            router.push(getMovieUrl(exactMovie))
            return
          }
          if (actors.length === 1 && movies.length === 0) {
            router.push(getActorUrl(actors[0]))
            return
          }
          if (movies.length === 1 && actors.length === 0) {
            router.push(getMovieUrl(movies[0]))
            return
          }
          router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
        })
        .catch(() => router.push(`/search?q=${encodeURIComponent(searchQuery)}`))
      return
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Accept inline autocomplete (Tab, ArrowRight, or Enter): complete text and show bouncing balls immediately, then navigate
    if ((e.key === "Tab" || e.key === "ArrowRight" || e.key === "Enter") && showInlineCompletion && inlineCompletionMatch) {
      e.preventDefault()
      e.stopPropagation()
      const fullText = inlineCompletionMatch.type === "actor" ? inlineCompletionMatch.item.name : inlineCompletionMatch.item.title
      const url = inlineCompletionMatch.type === "actor" ? getActorUrl(inlineCompletionMatch.item) : getMovieUrl(inlineCompletionMatch.item)
      flushSync(() => {
        setQuery(fullText)
        setIsFocused(false)
        setSuggestions(null)
        setHighlightedIndex(-1)
        setNavigating(true)
      })
      router.push(url)
      return
    }

    const displayed = suggestions
    const actors = displayed?.actors?.slice(0, 10) || []
    const movies = displayed?.movies?.slice(0, 10) || []
    const maxIndex = actors.length + movies.length - 1

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        e.stopPropagation()
        if (showDropdown && maxIndex >= 0) {
          setHighlightedIndex((prev) => {
            if (prev < maxIndex) {
              return prev + 1
            }
            return prev
          })
        }
        break
      case 'ArrowUp':
        e.preventDefault()
        e.stopPropagation()
        if (showDropdown && maxIndex >= 0) {
          setHighlightedIndex((prev) => {
            if (prev <= 0) {
              return -1
            }
            return prev - 1
          })
        }
        break
      case 'Enter':
        e.preventDefault()
        e.stopPropagation()
        handleSubmit(e as any)
        break
      case 'Escape':
        e.preventDefault()
        e.stopPropagation()
        setIsFocused(false)
        setHighlightedIndex(-1)
        break
      case ' ':
        // Prevent space from scrolling the page when dropdown is open (keeps focus and suggestions working)
        if (showDropdown) {
          e.preventDefault()
          setQuery((q) => q + ' ')
        }
        break
      default:
        break
    }
  }

  const handleSuggestionClick = (e: React.MouseEvent, url: string, fullText?: string) => {
    e.preventDefault()
    e.stopPropagation()
    flushSync(() => {
      if (fullText != null) setQuery(fullText)
      setIsFocused(false)
      setSuggestions(null)
      setHighlightedIndex(-1)
      // Do not set navigating: no overlay so click feels instant; router.push does client transition
    })
    router.push(url)
  }

  const totalSuggestions = (suggestions?.actors?.length || 0) + (suggestions?.movies?.length || 0)
  const hasResults = totalSuggestions > 0
  const isDiscoveryMode = isEmptyQuery && hasResults

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Overlay in portal so it's never clipped by parent overflow/transform; full viewport */}
      {navigating &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black flex items-center justify-center" aria-hidden>
            <BouncingBallsLoader size="lg" color="#FFD700" showText text="Loading..." />
          </div>,
          document.body
        )}
      <form onSubmit={(e) => {
        e.preventDefault()
        handleSubmit(e)
      }}>
        {/* Container that extends downward - simple container, wrapper provides 3D styling */}
        <motion.div
          className={cn(
            "relative overflow-hidden transition-all duration-200"
          )}
          animate={{
            borderRadius: showDropdown
              ? '2rem 2rem 2rem 2rem'
              : '2rem'
          }}
        >
          {/* Input Row - Always visible at top. Inline autocomplete = gray suffix overlay. */}
          <div className="relative">
            <IconSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 z-10" />
            {/* Inline autocomplete: gray suffix starts exactly after typed text (measured). */}
            {showInlineCompletion && inlineSuffix && (
              <div
                aria-hidden
                className="absolute left-12 right-10 top-0 bottom-0 flex items-center pointer-events-none overflow-hidden z-[2]"
              >
                <span
                  ref={measureRef}
                  className="absolute left-0 top-0 whitespace-nowrap opacity-0 pointer-events-none select-none"
                  style={{ visibility: 'hidden' }}
                >
                  {query}
                </span>
                {queryWidthPx > 0 && (
                  <span
                    className="text-muted-foreground whitespace-nowrap shrink-0"
                    style={{ marginLeft: queryWidthPx }}
                  >
                    {inlineSuffix}
                  </span>
                )}
              </div>
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onInput={(e) => {
                setQuery(e.currentTarget.value)
              }}
              onClick={(e) => {
                if (!disableAutoScrollOnFocus) {
                  e.preventDefault()
                  requestAnimationFrame(() => {
                    if (inputRef.current) {
                      const inputRect = inputRef.current.getBoundingClientRect()
                      const currentScroll = window.scrollY || window.pageYOffset
                      const inputTop = inputRect.top + currentScroll
                      const viewportHeight = window.innerHeight
                      const isDesktop = window.innerWidth >= 1024
                      const scrollOffset = isDesktop ? (viewportHeight / 5) : (viewportHeight / 4)
                      const targetScroll = inputTop - scrollOffset
                      window.scrollTo({
                        top: Math.max(0, targetScroll),
                        behavior: 'smooth'
                      })
                    }
                  })
                }
              }}
              onFocus={() => {
                setIsFocused(true)
                ensurePreload()
                if (!disableAutoScrollOnFocus) {
                  requestAnimationFrame(() => {
                    if (inputRef.current) {
                      const inputRect = inputRef.current.getBoundingClientRect()
                      const currentScroll = window.scrollY || window.pageYOffset
                      const inputTop = inputRect.top + currentScroll
                      const viewportHeight = window.innerHeight
                      const isDesktop = window.innerWidth >= 1024
                      const scrollOffset = isDesktop ? (viewportHeight / 5) : (viewportHeight / 4)
                      const targetScroll = inputTop - scrollOffset
                      window.scrollTo({
                        top: Math.max(0, targetScroll),
                        behavior: 'smooth'
                      })
                    }
                  })
                }
              }}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                // Delay blur to allow clicking on dropdown items
                setTimeout(() => setIsFocused(false), 150)
              }}
              placeholder={placeholder}
              autoFocus={autoFocus}
              className={cn(
                "relative z-[1] w-full pl-12 pr-10 py-3 text-base bg-transparent text-foreground placeholder-muted-foreground focus:outline-none focus:ring-0 border-0 transition-all duration-200"
              )}
            />
            <AnimatePresence>
              {showClear && query && (
                <motion.button
                  type="button"
                  onClick={handleClear}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors z-10"
                >
                  <IconX className="w-4 h-4" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Suggestions - Container extends downward */}
          <AnimatePresence>
            {showDropdown && (
              <motion.div
                ref={dropdownRef}
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, maxHeight: 0 }}
                animate={
                  reduceMotion
                    ? { opacity: 1 }
                    : { opacity: 1, maxHeight: '384px' }
                }
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, maxHeight: 0 }}
                transition={
                  reduceMotion
                    ? { duration: 0.12, ease: 'easeOut' }
                    : { duration: 0.2, ease: 'easeOut' }
                }
                className="overflow-y-auto max-h-96"
                style={{
                  ...(reduceMotion && { maxHeight: '384px' }),
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent',
                }}
              >
                {hasResults ? (
                  <motion.div className="p-2" initial={{}} animate={{}}>
                    {/* Actors */}
                    {suggestions?.actors && suggestions.actors.length > 0 && (
                      <div className="mb-2">
                        <div className="px-4 py-2 text-xs font-semibold text-[#FFD700] uppercase tracking-wide">
                          {isDiscoveryMode ? "Popular Actors" : "Actors"}
                        </div>
                        <motion.div
                          variants={reduceMotion ? undefined : staggerContainer}
                          initial={reduceMotion ? false : 'hidden'}
                          animate={reduceMotion ? false : 'show'}
                        >
                          {suggestions.actors.slice(0, 10).map((actor, index) => {
                            const isHighlighted = highlightedIndex === index
                            return (
                              <motion.div
                                variants={reduceMotion ? undefined : fadeInUp}
                                key={`search-actor-${actor.id}`}
                              >
                                <PrefetchLink
                                  href={getActorUrl(actor)}
                                  onClick={(e) => handleSuggestionClick(e, getActorUrl(actor), actor.name)}
                                  onMouseEnter={() => setHighlightedIndex(index)}
                                  data-highlight-index={index}
                                  className={cn(
                                    "w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 cursor-pointer group relative",
                                    isHighlighted ? "bg-[#1a1a1a]/50" : "hover:bg-[#1a1a1a]/30"
                                  )}
                                >
                                  {/* Vertical bar indicator for highlighted item */}
                                  {isHighlighted && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FFD700] rounded-l-lg" />
                                  )}
                                  {/* Actor avatar — photo (object-top) or initial fallback */}
                                  <div className="w-8 h-8 rounded-xl flex-shrink-0 overflow-hidden flex items-center justify-center bg-white/5 border border-white/10">
                                    {actor.imageUrl ? (
                                      <img
                                        src={actor.imageUrl}
                                        alt={actor.name}
                                        className="w-full h-full object-cover"
                                      style={{ objectPosition: 'top center' }}
                                        loading="lazy"
                                        decoding="async"
                                      />
                                    ) : (
                                      <span className="text-xs font-bold text-[#a1a1aa]">{actor.name.charAt(0)}</span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={cn(
                                      "truncate transition-all",
                                      isHighlighted ? "text-white font-medium text-base" : "text-gray-300 text-sm group-hover:text-white"
                                    )}>
                                      {actor.name}
                                    </div>
                                  </div>
                                </PrefetchLink>
                              </motion.div>
                            )
                          })}
                        </motion.div>
                      </div>
                    )}

                    {/* Movies */}
                    {suggestions?.movies && suggestions.movies.length > 0 && (
                      <div className="mb-2">
                        <div className="px-4 py-2 text-xs font-semibold text-[#FFD700] uppercase tracking-wide">
                          {isDiscoveryMode ? "Popular Movies" : "Movies"}
                        </div>
                        <motion.div
                          variants={reduceMotion ? undefined : staggerContainer}
                          initial={reduceMotion ? false : 'hidden'}
                          animate={reduceMotion ? false : 'show'}
                        >
                          {suggestions.movies.slice(0, 10).map((movie, index) => {
                            const actorOffset = (suggestions?.actors?.length || 0)
                            const movieIndex = actorOffset + index
                            const isHighlighted = highlightedIndex === movieIndex
                            return (
                              <motion.div
                                variants={reduceMotion ? undefined : fadeInUp}
                                key={`search-movie-${movie.id}`}
                              >
                                <PrefetchLink
                                  href={getMovieUrl(movie)}
                                  onClick={(e) => handleSuggestionClick(e, getMovieUrl(movie), movie.title)}
                                  onMouseEnter={() => setHighlightedIndex(movieIndex)}
                                  data-highlight-index={movieIndex}
                                  className={cn(
                                    "w-full text-left px-4 py-3 rounded-lg transition-all flex items-center gap-3 cursor-pointer group relative",
                                    isHighlighted ? "bg-[#1a1a1a]/50" : "hover:bg-[#1a1a1a]/30"
                                  )}
                                >
                                  {/* Vertical bar indicator for highlighted item */}
                                  {isHighlighted && (
                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FFD700] rounded-l-lg" />
                                  )}
                                  {/* Movie poster thumbnail (2:3 ratio) or film icon fallback */}
                                  <div className="w-6 h-9 rounded flex-shrink-0 overflow-hidden flex items-center justify-center bg-white/5 border border-white/10">
                                    {movie.posterUrl ? (
                                      <img
                                        src={movie.posterUrl}
                                        alt={movie.title}
                                        className="w-full h-full object-cover"
                                        loading="lazy"
                                        decoding="async"
                                      />
                                    ) : (
                                      <IconFilm className="w-3 h-3 text-[#71717a]" />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={cn(
                                      "truncate transition-all",
                                      isHighlighted ? "text-white font-medium text-base" : "text-gray-300 text-sm group-hover:text-white"
                                    )}>
                                      {movie.title}
                                    </div>
                                    {movie.year && (
                                      <div className={cn(
                                        "text-xs mt-0.5",
                                        isHighlighted ? "text-gray-400" : "text-gray-500"
                                      )}>
                                        {movie.year}
                                      </div>
                                    )}
                                  </div>
                                </PrefetchLink>
                              </motion.div>
                            )
                          })}
                        </motion.div>
                      </div>
                    )}

                    {/* View All Results - only when user has typed a query */}
                    {!isEmptyQuery && (
                      <div className="border-t border-white/10 pt-2 mt-2">
                        <motion.div variants={reduceMotion ? undefined : fadeInUp}>
                          <PrefetchLink
                            href={`/search?q=${encodeURIComponent(query)}`}
                            className="block w-full text-center px-4 py-3 text-sm text-[#FFD700] hover:bg-[#1a1a1a] rounded-lg transition-colors font-medium"
                            onClick={() => setIsFocused(false)}
                          >
                            View all {totalSuggestions} results
                          </PrefetchLink>
                        </motion.div>
                      </div>
                    )}
                  </motion.div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </form>
    </div>
  )
}