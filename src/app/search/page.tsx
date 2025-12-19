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
import { getActorUrl } from "@/lib/slugHelper"
import { PerformanceCard } from "@/components/performance/PerformanceCard"

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
  name: string
  imageUrl?: string | null
  slug?: string | null
  performanceCount?: number
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
        setSearchResults(data.actors || [])
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
              className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold mb-6 sm:mb-8 md:mb-10 lg:mb-12"
              style={{ 
                fontFamily: 'var(--font-cinzel), serif',
                textShadow: '0 10px 40px rgba(0,0,0,0.7)',
                letterSpacing: '0.08em',
                lineHeight: '1.1',
              }}
            >
              <span className="text-white">Search </span>
              <span 
                style={{
                  background: 'linear-gradient(135deg, #FFE55C 0%, #FFD700 35%, #FFA500 80%, #FF8C00 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  filter: 'drop-shadow(0 0 40px rgba(255, 215, 0, 0.3))',
                }}
              >
                Actors
              </span>
            </h1>
              
            {/* Gold Divider - Cinematic */}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: "180px", opacity: 1 }}
              transition={{ duration: 2, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="h-[2px] mx-auto mb-6 sm:mb-8 md:mb-10 lg:mb-12 relative"
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
                  placeholder="Search for actors..."
                  showClear
                  autoFocus 
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
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-square bg-gray-800 rounded-2xl mb-3"></div>
                      <div className="h-4 bg-gray-800 rounded w-3/4 mx-auto"></div>
                    </div>
                  ))}
                </div>
              ) : searchResults.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {searchResults.map((actor, index) => (
                    <motion.div
                      key={actor.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Link
                        href={getActorUrl({ id: actor.id, name: actor.name, slug: actor.slug || null })}
                        className="group block"
                      >
                        <div className="aspect-square rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 mb-3 flex items-center justify-center border-2 border-transparent group-hover:border-[#FFD700] transition-all overflow-hidden">
                          {actor.imageUrl ? (
                            <img
                              src={actor.imageUrl}
                              alt={actor.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-4xl font-bold text-gray-600">
                              {actor.name.charAt(0)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-center text-gray-300 group-hover:text-[#FFD700] transition-colors line-clamp-2">
                          {actor.name}
                        </p>
                        {actor.performanceCount && actor.performanceCount > 0 && (
                          <p className="text-xs text-center text-gray-500 mt-1">
                            {actor.performanceCount} {actor.performanceCount === 1 ? 'performance' : 'performances'}
                          </p>
                        )}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <Film className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                  <p className="text-xl text-gray-400">No actors found matching "{query}"</p>
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
        <div className="animate-spin w-12 h-12 border-4 border-[#FFD700] border-t-transparent rounded-full"></div>
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  )
}
