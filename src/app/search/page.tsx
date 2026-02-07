"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useUser } from "@/components/providers/SessionProvider"
import { SignedInLayout, HomeLayout } from "@/components/layout"
import { SearchBar } from "@/components/SearchBar"
import { motion } from "framer-motion"
import { Film } from "lucide-react"
import Link from "next/link"
import { getActorUrl, getMovieUrl } from "@/lib/slugHelper"
import { PerformanceCard } from "@/components/performance/PerformanceCard"
import { BouncingBallsLoader } from "@/components/ui/BouncingBallsLoader"

interface Actor {
  id: string
  name: string
  imageUrl?: string | null
  slug?: string | null
  _count?: {
    performances: number
  }
}

interface SearchResult {
  id: string
  name?: string
  title?: string
  imageUrl?: string | null
  slug?: string | null
  year?: number
  performanceCount?: number
  type: 'actor' | 'movie'
}


function SearchPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const user = useUser()
  const query = searchParams?.get('q') || ""

  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (query) {
      performSearch(query)
    } else {
      setSearchResults([])
    }
  }, [query])

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        const actors = (data.actors || []).map((actor: any) => ({
          ...actor,
          name: actor.name,
          type: 'actor' as const
        }))
        const movies = (data.movies || []).map((movie: any) => ({
          ...movie,
          title: movie.title,
          type: 'movie' as const
        }))
        setSearchResults([...actors, ...movies])
      }
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setSearching(false)
    }
  }

  const Layout = user ? SignedInLayout : HomeLayout

  return (
    <Layout>
      <div className="min-h-screen bg-black">
        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 sm:pt-20 pb-12 sm:pb-16">
          <motion.div 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.4, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="text-center mb-12"
          >
            <h1 
              className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold mb-3 sm:mb-4 text-white"
              style={{ 
                fontFamily: 'var(--font-cinzel), serif',
                textShadow: '0 10px 40px rgba(0,0,0,0.7)',
                letterSpacing: '0.08em',
                lineHeight: '1.1',
              }}
            >
              Search
            </h1>
              
            {/* Gold Divider - Cinematic */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "180px", opacity: 1 }}
              transition={{ duration: 2, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="h-[2px] mx-auto mb-3 sm:mb-4 relative"
            >
              <div 
                className="h-full w-full"
                style={{
                  background: 'linear-gradient(90deg, transparent 0%, rgba(255,229,92,0.4) 15%, rgba(255,215,0,0.9) 40%, rgba(255,215,0,1) 50%, rgba(255,215,0,0.9) 60%, rgba(255,229,92,0.4) 85%, transparent 100%)',
                  boxShadow: '0 0 20px rgba(255, 215, 0, 0.6), 0 0 40px rgba(255, 215, 0, 0.3)',
                }}
              />
            </motion.div>

            {/* Subtitle - Clear & Compelling */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 0.9, ease: 'easeOut' }}
              className="text-base sm:text-lg md:text-xl lg:text-2xl w-full max-w-4xl mx-auto leading-relaxed text-[#a3a3a3] font-light text-center px-4"
              style={{ letterSpacing: '0.005em' }}
            >
              Discover performances to rate.
            </motion.p>
          </motion.div>

          {/* Search Bar */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-3xl mx-auto mb-16"
          >
            <div className="relative group">
              <div 
                className="relative rounded-[2rem] border border-transparent bg-[#1a1a1a] backdrop-blur-2xl overflow-hidden transition-all duration-300"
                style={{
                  boxShadow: `
                    0 25px 70px -15px rgba(0, 0, 0, 0.9),
                    0 15px 40px -10px rgba(0, 0, 0, 0.7),
                    0 0 0 1px rgba(255, 255, 255, 0.05),
                    inset 0 1px 0 0 rgba(255, 255, 255, 0.1),
                    inset 0 -1px 0 0 rgba(0, 0, 0, 0.3)
                  `,
                  transform: 'translateY(-4px) perspective(1000px) rotateX(1deg)',
                  transformStyle: 'preserve-3d',
                }}
              >
                <SearchBar
                  placeholder="Search for actors and movies..."
                  showClear
                  autoFocus
                  disableAutoScrollOnFocus
                  initialValue={query}
                  className="w-full [&_input]:bg-transparent [&_input]:border-0 [&_input]:text-white [&_input]:placeholder:text-[#71717a] [&_input]:focus:ring-0 [&_input]:focus:outline-none [&_input]:py-4 [&_input]:text-lg"
                />
              </div>
            </div>
          </motion.div>
        </div>

            {/* Search Results */}
        {query && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-bold text-white mb-8">
                {searching ? 'Searching...' : `Results for "${query}"`}
              </h2>

              {searching ? (
                <div className="flex justify-center py-16">
                  <BouncingBallsLoader size="md" color="#FFD700" showText={false} />
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {searchResults.map((result, index) => (
                    <motion.div
                      key={`${result.type}-${result.id}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      {result.type === 'actor' ? (
                        <Link
                          href={getActorUrl({ id: result.id, name: result.name || '', slug: result.slug || null })}
                          className="group block"
                        >
                          <div className="aspect-square rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 mb-3 flex items-center justify-center border-2 border-transparent group-hover:border-[#FFD700] transition-all overflow-hidden">
                            {result.imageUrl ? (
                              <img
                                src={result.imageUrl}
                                alt={result.name}
                                loading="lazy"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-4xl font-bold text-gray-600">
                                {result.name?.charAt(0) || 'A'}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-center text-gray-300 group-hover:text-[#FFD700] transition-colors line-clamp-2">
                            {result.name}
                          </p>
                          {result.performanceCount && result.performanceCount > 0 && (
                            <p className="text-xs text-center text-gray-500 mt-1">
                              {result.performanceCount} {result.performanceCount === 1 ? 'performance' : 'performances'}
                            </p>
                          )}
                        </Link>
                      ) : (
                        <Link
                          href={getMovieUrl({ id: result.id, title: result.title || '', year: result.year || 0, slug: result.slug || null })}
                          className="group block"
                        >
                          <div className="aspect-square rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 mb-3 flex items-center justify-center border-2 border-transparent group-hover:border-[#FFD700] transition-all overflow-hidden">
                            <Film className="w-12 h-12 text-gray-600" />
                          </div>
                          <p className="text-sm font-medium text-center text-gray-300 group-hover:text-[#FFD700] transition-colors line-clamp-2">
                            {result.title}
                          </p>
                          {result.year && (
                            <p className="text-xs text-center text-gray-500 mt-1">
                              {result.year}
                            </p>
                          )}
                        </Link>
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-xl text-gray-400">No results found matching "{query}"</p>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </Layout>
  )
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <BouncingBallsLoader size="lg" color="#FFD700" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  )
}
