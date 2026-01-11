"use client"

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NewSearchResult } from '@/types'
import Link from 'next/link'
import { PrefetchLink } from '@/components/ui/PrefetchLink'
import { fadeInUp, getMotionProps, fadeIn, staggerContainer } from '@/lib/animations'
import { getActorUrl } from '@/lib/slugHelper'
import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'

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

// Debounce utility function - optimized for instant UI updates
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

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
  placeholder = "Search actors...",
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
  const [hasSearched, setHasSearched] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const controllerRef = useRef<AbortController | null>(null)

  // Debounced search for suggestions - optimized for instant appearance
  const performSearch = useCallback(async (searchQuery: string, shouldShowSuggestions: boolean) => {
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
      setHasSearched(false)
      try {
        if (controllerRef.current) controllerRef.current.abort()
        const controller = new AbortController()
        controllerRef.current = controller
        const response = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        if (!response.ok) {
          setSuggestions(null)
          setHasSearched(true)
          return
        }
        const data = await response.json()
        setSuggestions(data)
        setHasSearched(true)
        if (!hasFetchedOnce) setHasFetchedOnce(true)
      } catch (error: any) {
        if (error?.name === 'AbortError') return
        console.error('Search failed:', error)
        setSuggestions(null)
        setHasSearched(true)
      } finally {
        setLoading(false)
      }
  }, [hasFetchedOnce])

  const debouncedSearch = useMemo(
    () => debounce(performSearch, 150),
    [performSearch]
  )



  useEffect(() => {
    if (query.trim() && query.trim().length >= 2 && showSuggestions) {
      // Show dropdown instantly while typing (before API call completes)
      setShowSuggestionsDropdown(true)
      debouncedSearch(query, showSuggestions)
      // Reset highlighted index when query changes (will be set to 0 when suggestions arrive)
      setHighlightedIndex(-1)
    } else {
      setSuggestions(null)
      setShowSuggestionsDropdown(false)
      setHighlightedIndex(-1)
    }
  }, [query, debouncedSearch, showSuggestions])

  // Update highlighted index when suggestions change - always highlight first suggestion
  useEffect(() => {
    if (suggestions?.actors && suggestions.actors.length > 0) {
      // Always highlight the first suggestion
      setHighlightedIndex(0)
    } else {
      setHighlightedIndex(-1)
    }
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

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setQuery('')
    setSuggestions(null)
    setShowSuggestionsDropdown(false)
    setHighlightedIndex(-1)
    if (onSearch) {
      onSearch('')
    }
    inputRef.current?.focus()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    const actors = suggestions?.actors?.slice(0, 10) || []
    
    // If we have suggestions and a highlighted one, navigate to that actor
    if (actors.length > 0 && highlightedIndex >= 0 && highlightedIndex < actors.length && actors[highlightedIndex]) {
      const selectedActor = actors[highlightedIndex]
      setQuery(selectedActor.name)
      setShowSuggestionsDropdown(false)
      setHighlightedIndex(-1)
      router.push(getActorUrl(selectedActor))
      return
    }
    
    // If no suggestions but query exists, navigate to search page
    if (query.trim() && actors.length === 0) {
      setShowSuggestionsDropdown(false)
      setHighlightedIndex(-1)
      if (onSearch) {
        onSearch(query.trim())
      } else {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`)
      }
      return
    }
    
    // If input is empty, do nothing
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const actors = suggestions?.actors?.slice(0, 10) || []
    const maxIndex = actors.length - 1

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        e.stopPropagation()
        if (showSuggestionsDropdown && actors.length > 0) {
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
        if (showSuggestionsDropdown && actors.length > 0) {
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
        setShowSuggestionsDropdown(false)
        setHighlightedIndex(-1)
        break
      default:
        // For other keys, don't prevent default
        break
    }
  }

  const handleSuggestionClick = () => {
    setShowSuggestionsDropdown(false)
    setQuery('')
  }

  const totalSuggestions = (suggestions?.actors?.length || 0)

  const hasResults = totalSuggestions > 0

  return (
    <div ref={containerRef} className={cn("relative", className)}>
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
            borderRadius: showSuggestionsDropdown && query.trim().length >= 2 && showSuggestions 
              ? '2rem 2rem 2rem 2rem' 
              : '2rem'
          }}
        >
          {/* Input Row - Always visible at top */}
          <div className="relative">
            <IconSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 z-10" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                const newValue = e.target.value
                setQuery(newValue)
                
                // Show dropdown instantly when typing (optimistic UI)
                if (newValue.trim().length >= 2 && showSuggestions) {
                  setShowSuggestionsDropdown(true)
                } else {
                  setShowSuggestionsDropdown(false)
                }
              }}
              onClick={(e) => {
                // Also trigger scroll on click
                e.preventDefault()
                requestAnimationFrame(() => {
                  if (inputRef.current) {
                    const inputRect = inputRef.current.getBoundingClientRect()
                    const currentScroll = window.scrollY || window.pageYOffset
                    const inputTop = inputRect.top + currentScroll
                    const viewportHeight = window.innerHeight
                    const targetScroll = inputTop - (viewportHeight / 3)
                    
                    window.scrollTo({
                      top: Math.max(0, targetScroll),
                      behavior: 'smooth'
                    })
                  }
                })
              }}
              onFocus={(e) => {
                setIsFocused(true)
                
                // Smooth scroll to position search bar in upper third of screen
                requestAnimationFrame(() => {
                  if (inputRef.current) {
                    const inputRect = inputRef.current.getBoundingClientRect()
                    const currentScroll = window.scrollY || window.pageYOffset
                    const inputTop = inputRect.top + currentScroll
                    const viewportHeight = window.innerHeight
                    const targetScroll = inputTop - (viewportHeight / 3)
                    
                    window.scrollTo({
                      top: Math.max(0, targetScroll),
                      behavior: 'smooth'
                    })
                  }
                })
                
                // Warm suggestions cache on first focus using current query if present
                if (query.trim().length >= 2 && !loading && showSuggestions) {
                  debouncedSearch(query, showSuggestions)
                  setShowSuggestionsDropdown(true)
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
                "w-full pl-12 pr-10 py-3 bg-transparent text-foreground placeholder-muted-foreground focus:outline-none focus:ring-0 border-0 transition-all duration-200"
              )}
            />
            <AnimatePresence>
              {showClear && query && (
                <motion.button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleClear()
                  }}
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
            {showSuggestionsDropdown && query.trim().length >= 2 && showSuggestions && (
              <motion.div
                ref={dropdownRef}
                initial={{ opacity: 0, maxHeight: 0 }}
                animate={{ opacity: 1, maxHeight: '384px' }}
                exit={{ opacity: 0, maxHeight: 0 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                className="overflow-y-auto max-h-96"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255, 255, 255, 0.2) transparent',
                }}
              >
                {loading ? (
                  <div className="p-6 text-center">
                    <BouncingBallsLoader size="sm" color="#FFD700" className="mb-3" />
                    <p className="text-sm text-gray-300">Searching...</p>
                  </div>
                ) : !hasSearched ? (
                  <div className="p-6 text-center">
                    <BouncingBallsLoader size="sm" color="#FFD700" className="mb-3" />
                    <p className="text-sm text-gray-300">Searching...</p>
                  </div>
                ) : hasResults ? (
                  <motion.div className="p-2" initial={{}} animate={{}}>
                    {/* Actors */}
                    {suggestions?.actors && suggestions.actors.length > 0 && (
                      <div className="mb-2">
                        <div className="px-4 py-2 text-xs font-semibold text-[#FFD700] uppercase tracking-wide">
                          Actors
                        </div>
                        <motion.div variants={staggerContainer} initial="hidden" animate="show">
                          {suggestions.actors.slice(0, 10).map((actor, index) => {
                            const isHighlighted = highlightedIndex === index
                            return (
                              <motion.div variants={fadeInUp} key={`search-actor-${actor.id}`}>
                                <PrefetchLink
                                  href={getActorUrl(actor)}
                                  onClick={handleSuggestionClick}
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
                                  <IconUser className={cn(
                                    "w-4 h-4 flex-shrink-0 transition-colors",
                                    isHighlighted ? "text-[#FFD700]" : "text-gray-400 group-hover:text-[#FFD700]"
                                  )} />
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

                    {/* View All Results */}
                    <div className="border-t border-white/10 pt-2 mt-2">
                      <motion.div variants={fadeInUp}>
                        <PrefetchLink
                          href={`/search?q=${encodeURIComponent(query)}`}
                          className="block w-full text-center px-4 py-3 text-sm text-[#FFD700] hover:bg-[#1a1a1a] rounded-lg transition-colors font-medium"
                          onClick={() => setShowSuggestionsDropdown(false)}
                        >
                          View all {totalSuggestions} results
                        </PrefetchLink>
                      </motion.div>
                    </div>
                  </motion.div>
                ) : hasSearched && !loading && !hasResults ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-white">No results found</p>
                    <p className="text-xs text-gray-400 mt-1">Try different keywords</p>
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </form>
    </div>
  )
}