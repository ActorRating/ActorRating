"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NewSearchResult } from '@/types'
import Link from 'next/link'
import { PrefetchLink } from '@/components/ui/PrefetchLink'
import { staggerContainer, fadeInUp, getMotionProps } from '@/lib/animations'

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
}

export function SearchBar({
  placeholder = "Search actors, movies...",
  className = "",
  onSearch,
  initialValue = "",
  showClear = true,
  autoFocus = false,
  showSuggestions = true,
}: SearchBarProps) {
  const [query, setQuery] = useState(initialValue)
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<NewSearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [showSuggestionsDropdown, setShowSuggestionsDropdown] = useState(false)
  const [hasFetchedOnce, setHasFetchedOnce] = useState(false)
  const [hasAnimatedOnce, setHasAnimatedOnce] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<AbortController | null>(null)

  // Throttled search for suggestions (updates continuously while typing)
  const throttledSearch = useCallback(
    throttle(async (searchQuery: string, shouldShowSuggestions: boolean) => {
      const q = searchQuery.trim()
      if (!q || q.length < 2 || !shouldShowSuggestions) {
        if (controllerRef.current) controllerRef.current.abort()
        setSuggestions(null)
        setShowSuggestionsDropdown(false)
        return
      }

      // Make dropdown visible while loading
      setShowSuggestionsDropdown(true)
      setLoading(true)
      try {
        if (controllerRef.current) controllerRef.current.abort()
        const controller = new AbortController()
        controllerRef.current = controller
        const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        if (!response.ok) {
          setSuggestions(null)
          return
        }
        const data = await response.json()
        setSuggestions(data)
        if (!hasFetchedOnce) setHasFetchedOnce(true)
      } catch (error: any) {
        if (error?.name === 'AbortError') return
        console.error('Search failed:', error)
        setSuggestions(null)
      } finally {
        setLoading(false)
      }
    }, 200, { leading: true, trailing: true }),
    [hasFetchedOnce]
  )

  useEffect(() => {
    if (query.trim() && query.trim().length >= 2) {
      // Ensure dropdown is visible while typing
      setShowSuggestionsDropdown(true)
      throttledSearch(query, showSuggestions)
    } else {
      setSuggestions(null)
      setShowSuggestionsDropdown(false)
    }
  }, [query])

  // Mark that we've animated once when the dropdown is first shown
  useEffect(() => {
    if (showSuggestionsDropdown && !hasAnimatedOnce) {
      setHasAnimatedOnce(true)
    }
  }, [showSuggestionsDropdown, hasAnimatedOnce])



  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestionsDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleClear = () => {
    setQuery('')
    setSuggestions(null)
    setShowSuggestionsDropdown(false)
    if (onSearch) {
      onSearch('')
    }
    inputRef.current?.focus()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      // If we have suggestions and they're visible, keep the dropdown open
      // Otherwise, proceed with the normal flow
      if (suggestions && hasResults && showSuggestionsDropdown) {
        // Keep dropdown open to show results
        return
      }
      
      setShowSuggestionsDropdown(false)
      if (onSearch) {
        onSearch(query.trim())
      } else {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`)
      }
    }
  }

  const handleSuggestionClick = () => {
    setShowSuggestionsDropdown(false)
    setQuery('')
  }

  const totalSuggestions = (suggestions?.actors?.length || 0) + 
                          (suggestions?.movies?.length || 0)

  const hasResults = totalSuggestions > 0

  return (
    <div className={cn("relative", className)}>
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <IconSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              setIsFocused(true)
              // Warm suggestions cache on first focus using current query if present
              if (query.trim().length >= 2 && !loading) {
                throttledSearch(query, showSuggestions)
              }
            }}
            onBlur={() => setIsFocused(false)}
            placeholder={placeholder}
            autoFocus={autoFocus}
            className={cn(
              "w-full pl-10 pr-10 py-3 bg-background border border-border rounded-2xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200",
              isFocused && "border-primary/50"
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
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
              >
                <IconX className="w-4 h-4" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </form>

            {/* Suggestions Dropdown */}
      <AnimatePresence>
        {showSuggestionsDropdown && (suggestions || loading) && (
          <motion.div
            ref={dropdownRef}
            initial={hasAnimatedOnce ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 border border-border rounded-xl shadow-2xl max-h-96 overflow-y-auto"
            style={{ 
              backgroundColor: '#000000',
              zIndex: 999999,
              position: 'absolute',
              isolation: 'isolate'
            }}
          >
            {loading && !hasFetchedOnce ? (
              <div className="p-4 text-center">
                <div className="animate-spin w-5 h-5 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-sm text-white">Searching...</p>
              </div>
            ) : hasResults ? (
              <motion.div className="p-2" initial={{}} animate={{}}>
                {/* Actors */}
                {suggestions?.actors && suggestions.actors.length > 0 && (
                  <div className="mb-4">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-300 uppercase tracking-wide">
                      Actors
                    </div>
                    <motion.div variants={staggerContainer} initial="hidden" animate="show">
                      {suggestions.actors.slice(0, 10).map((actor) => (
                        <motion.div variants={fadeInUp} key={`search-actor-${actor.id}`}>
                          <PrefetchLink
                            href={`/actors/${actor.id}`}
                            onClick={handleSuggestionClick}
                            className="w-full text-left p-3 hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-3 cursor-pointer hover:underline"
                          >
                            <IconUser className="w-4 h-4 text-accent flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-white truncate">
                                {actor.name}
                              </div>
                            </div>
                          </PrefetchLink>
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                )}

                {/* Movies */}
                {suggestions?.movies && suggestions.movies.length > 0 && (
                  <div className="mb-4">
                    <div className="px-3 py-2 text-xs font-semibold text-gray-300 uppercase tracking-wide">
                      Movies
                    </div>
                    <motion.div variants={staggerContainer} initial="hidden" animate="show">
                      {suggestions.movies.slice(0, 10).map((movie) => (
                        <motion.div variants={fadeInUp} key={`movie-${movie.id}`}>
                          <PrefetchLink
                            href={`/movies/${movie.id}`}
                            onClick={handleSuggestionClick}
                            className="w-full text-left p-3 hover:bg-gray-800 rounded-lg transition-colors flex items-center gap-3 cursor-pointer hover:underline"
                          >
                            <IconFilm className="w-4 h-4 text-accent flex-shrink-0" />
                            <div className="flex-1 min-w-0 flex items-center gap-2">
                              <div className="font-medium text-white truncate">
                                {movie.title}
                              </div>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700 text-gray-300 flex-shrink-0">
                                {movie.year}
                              </span>
                            </div>
                          </PrefetchLink>
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                )}



                {/* View All Results */}
                <div className="border-t border-border pt-2">
                  <motion.div variants={fadeInUp}>
                    <PrefetchLink
                    href={`/search?q=${encodeURIComponent(query)}`}
                    className="block w-full text-center p-3 text-sm text-primary hover:bg-gray-800 rounded-lg transition-colors"
                    onClick={() => setShowSuggestionsDropdown(false)}
                    >
                    View all {totalSuggestions} results
                    </PrefetchLink>
                  </motion.div>
                </div>
              </motion.div>
            ) : query.trim() && !loading ? (
              <div className="p-4 text-center">
                <p className="text-sm text-white">No results found</p>
                <p className="text-xs text-gray-300 mt-1">Try different keywords</p>
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Throttle utility function
function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  options?: { leading?: boolean; trailing?: boolean }
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  let lastCall = 0
  let lastArgs: Parameters<T> | null = null
  const leading = options?.leading !== false
  const trailing = options?.trailing !== false

  const invoke = (args: Parameters<T>) => {
    lastCall = Date.now()
    func(...args)
  }

  return (...args: Parameters<T>) => {
    const now = Date.now()
    if (!lastCall && !leading) lastCall = now
    const remaining = wait - (now - lastCall)
    lastArgs = args

    if (remaining <= 0 || remaining > wait) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      invoke(args)
    } else if (trailing && !timeout) {
      timeout = setTimeout(() => {
        timeout = null
        if (!leading) {
          lastCall = 0
        } else {
          lastCall = Date.now()
        }
        if (lastArgs) invoke(lastArgs)
      }, remaining)
    }
  }
}