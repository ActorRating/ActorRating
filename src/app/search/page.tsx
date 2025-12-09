"use client"

export const dynamic = "force-dynamic"

import { useState, useEffect, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useUser } from "@/components/providers/SessionProvider"
import { SignedInLayout, HomeLayout } from "@/components/layout"
import { SearchBar } from "@/components/SearchBar"
import { motion } from "framer-motion"
import { TrendingUp, Film, Star } from "lucide-react"
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

// Popular actors - hardcoded for immediate display
const POPULAR_ACTORS = [
  { name: "Timothée Chalamet", id: "timothee-chalamet" },
  { name: "Zendaya", id: "zendaya" },
  { name: "Cillian Murphy", id: "cillian-murphy" },
  { name: "Emma Stone", id: "emma-stone" },
  { name: "Florence Pugh", id: "florence-pugh" },
  { name: "Austin Butler", id: "austin-butler" },
  { name: "Margot Robbie", id: "margot-robbie" },
  { name: "Ryan Gosling", id: "ryan-gosling" }
]

function SearchPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const user = useUser()
  const query = searchParams?.get('q') || ""

  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [popularActors, setPopularActors] = useState<Actor[]>([])
  const [searching, setSearching] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPopularActors()
  }, [])

  useEffect(() => {
    if (query) {
      performSearch(query)
    } else {
      setSearchResults([])
    }
  }, [query])

  const fetchPopularActors = async () => {
    try {
      const response = await fetch('/api/actors/popular?limit=8')
      if (response.ok) {
        const data = await response.json()
        setPopularActors(data)
      }
    } catch (error) {
      console.error('Failed to fetch popular actors:', error)
    } finally {
      setLoading(false)
    }
  }

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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-[#FFD700] via-[#FFC700] to-[#FFD700] bg-clip-text text-transparent">
                Find Your Favorite
                </span>
              </h1>
            <p className="text-xl text-gray-400">Search and discover performances to rate</p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="max-w-3xl mx-auto mb-16"
          >
              <SearchBar 
                placeholder="Search for actors..." 
              showClear
                autoFocus 
                initialValue={query}
              className="w-full"
              />
          </motion.div>
            </div>

            {/* Search Results */}
        {query ? (
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
        ) : (
          /* Popular Actors - shown when no search query */
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-8">
                <TrendingUp className="w-6 h-6 text-[#FFD700]" />
                <h2 className="text-3xl font-bold text-white">Popular Actors</h2>
              </div>

              {loading ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="aspect-square bg-gray-800 rounded-2xl mb-3"></div>
                      <div className="h-4 bg-gray-800 rounded w-3/4 mx-auto"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {(popularActors.length > 0 ? popularActors : POPULAR_ACTORS).map((actor, index) => (
                    <motion.div
                      key={actor.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.3, delay: 0.2 + index * 0.05 }}
                    >
                      <Link
                        href={getActorUrl({ id: actor.id, name: actor.name, slug: (actor as Actor).slug || null })}
                        className="group block"
                      >
                        <div className="aspect-square rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 mb-3 flex items-center justify-center border-2 border-transparent group-hover:border-[#FFD700] transition-all overflow-hidden">
                          {(actor as Actor).imageUrl ? (
                            <img
                              src={(actor as Actor).imageUrl || ''}
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
                        {(actor as Actor)._count?.performances && (actor as Actor)._count!.performances > 0 && (
                          <p className="text-xs text-center text-gray-500 mt-1">
                            {(actor as Actor)._count!.performances} {(actor as Actor)._count!.performances === 1 ? 'performance' : 'performances'}
                          </p>
                        )}
                      </Link>
                    </motion.div>
                  ))}
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
