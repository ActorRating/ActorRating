"use client"

/**
 * Search — query → results, same visual language as Discover.
 */

import { useState, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Image from "next/image"
import { PrefetchLink } from "@/components/ui/PrefetchLink"
import { useUser } from "@/components/providers/SessionProvider"
import { SignedInLayout, HomeLayout } from "@/components/layout"
import { SearchBar } from "@/components/SearchBar"
import { BouncingBallsLoader } from "@/components/ui/BouncingBallsLoader"
import { getActorUrl, getMovieUrl } from "@/lib/slugHelper"

const DISPLAY: React.CSSProperties = {
  fontFamily:
    'var(--font-cormorant-garamond), "Cormorant Garamond", Georgia, serif',
}
const SANS: React.CSSProperties = {
  fontFamily: "var(--font-geist-sans), var(--font-sans), system-ui, sans-serif",
}

interface SearchResult {
  id: string
  name?: string
  title?: string
  imageUrl?: string | null
  posterUrl?: string | null
  slug?: string | null
  year?: number
  type: "actor" | "movie"
}

function upgradeThumb(url?: string | null): string | null {
  if (!url) return null
  return url
    .replace("/t/p/w45/", "/t/p/w185/")
    .replace("/t/p/w92/", "/t/p/w185/")
    .replace("/t/p/w185/", "/t/p/w342/")
}

function ResultSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-10 sm:mb-14">
      <div className="mb-3 sm:mb-3.5 text-center">
        <h2
          className="text-lg sm:text-xl font-semibold text-white tracking-tight"
          style={SANS}
        >
          {title}
        </h2>
      </div>
      <div className="mb-4 h-px w-full bg-zinc-700 sm:mb-5" aria-hidden />
      {children}
    </section>
  )
}

function SearchPageContent() {
  const searchParams = useSearchParams()
  const user = useUser()
  const query = searchParams?.get("q") || ""

  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (query) {
      performSearch(query)
    } else {
      setSearchResults([])
      setSearching(false)
    }
  }, [query])

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}`,
      )
      if (response.ok) {
        const data = await response.json()
        const actors = (data.actors || []).map((actor: SearchResult) => ({
          ...actor,
          name: actor.name,
          type: "actor" as const,
        }))
        const movies = (data.movies || []).map((movie: SearchResult) => ({
          ...movie,
          title: movie.title,
          type: "movie" as const,
        }))
        setSearchResults([...actors, ...movies])
      }
    } catch (error) {
      console.error("Search failed:", error)
    } finally {
      setSearching(false)
    }
  }

  const actors = searchResults.filter((r) => r.type === "actor")
  const movies = searchResults.filter((r) => r.type === "movie")
  const Layout = user ? SignedInLayout : HomeLayout

  const body = (
    <div className="min-h-screen bg-black w-full" style={SANS}>
      <header className="px-5 sm:px-8 lg:px-10 pt-[6.5rem] sm:pt-[7.5rem] pb-8 sm:pb-10">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-[#FFD700]/70 mb-3">
            Search
          </p>
          <h1
            className="text-3xl sm:text-4xl md:text-[2.75rem] font-bold text-white tracking-tight leading-[1.15]"
            style={DISPLAY}
          >
            Find actors &amp; films
          </h1>
          <p className="mt-3 text-[15px] sm:text-base text-zinc-500 leading-relaxed max-w-xl mx-auto">
            Type a name — jump to their page and rate a performance.
          </p>
          <div className="mt-7 sm:mt-8 max-w-xl mx-auto text-left relative z-30">
            <div
              className="relative rounded-[2rem] border border-white/[0.06] bg-[#1a1a1a] overflow-hidden"
              style={{
                boxShadow:
                  "0 20px 50px -18px rgba(0,0,0,0.85), inset 0 1px 0 0 rgba(255,255,255,0.06)",
              }}
            >
              <SearchBar
                placeholder="Search actors and films…"
                showClear
                showSuggestions={false}
                autoFocus
                disableAutoScrollOnFocus
                initialValue={query}
                className="w-full [&_input]:bg-transparent [&_input]:border-0 [&_input]:text-white [&_input]:placeholder:text-[#71717a] [&_input]:focus:ring-0 [&_input]:focus:outline-none [&_input]:py-4 [&_input]:text-base sm:[&_input]:text-lg [&_input]:min-h-[52px]"
              />
            </div>
          </div>
        </div>
      </header>

      {query ? (
        <div className="px-5 sm:px-8 lg:px-10 pb-20 sm:pb-28">
          <div className="max-w-7xl mx-auto">
            {searching ? (
              <div className="flex justify-center py-16">
                <BouncingBallsLoader size="md" color="#FFD700" showText={false} />
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-center text-zinc-500 text-[15px] py-16">
                No results for &ldquo;{query}&rdquo;
              </p>
            ) : (
              <>
                {actors.length > 0 ? (
                  <ResultSection title="Actors">
                    <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
                      {actors.map((result) => {
                        const href = getActorUrl({
                          id: result.id,
                          name: result.name || "",
                          slug: result.slug || null,
                        })
                        const face =
                          upgradeThumb(result.imageUrl) ?? result.imageUrl ?? null
                        const initial =
                          result.name?.trim().charAt(0).toUpperCase() || "?"
                        return (
                          <PrefetchLink
                            key={`actor-${result.id}`}
                            href={href}
                            className="group w-[86px] sm:w-[92px] md:w-[100px] lg:w-[110px] text-center"
                            title={result.name}
                          >
                            <div className="origin-center transition-transform duration-300 group-hover:scale-[1.03]">
                              <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-[#141414] ring-1 ring-white/[0.08] group-hover:ring-[#FFD700]/35 transition-[box-shadow] duration-300">
                                {face ? (
                                  <Image
                                    src={face}
                                    alt={result.name || "Actor"}
                                    fill
                                    className="object-cover object-[center_20%]"
                                    sizes="140px"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-center justify-center bg-zinc-900 text-lg font-semibold text-zinc-500">
                                    {initial}
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className="mt-2 text-[11px] sm:text-xs font-medium text-zinc-400 leading-tight line-clamp-2 group-hover:text-white transition-colors">
                              {result.name}
                            </p>
                          </PrefetchLink>
                        )
                      })}
                    </div>
                  </ResultSection>
                ) : null}

                {movies.length > 0 ? (
                  <ResultSection title="Films">
                    <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
                      {movies.map((result) => {
                        const href = getMovieUrl({
                          id: result.id,
                          title: result.title || "",
                          year: result.year || 0,
                          slug: result.slug || null,
                        })
                        const poster =
                          upgradeThumb(result.posterUrl) ??
                          result.posterUrl ??
                          null
                        return (
                          <PrefetchLink
                            key={`movie-${result.id}`}
                            href={href}
                            className="group w-[86px] sm:w-[92px] md:w-[100px] lg:w-[110px] text-center"
                            title={result.title}
                          >
                            <div className="origin-center transition-transform duration-300 group-hover:scale-[1.03]">
                              <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-[#141414] ring-1 ring-white/[0.08] group-hover:ring-[#FFD700]/35 transition-[box-shadow] duration-300">
                                {poster ? (
                                  <Image
                                    src={poster}
                                    alt={result.title || "Film"}
                                    fill
                                    className="object-cover"
                                    sizes="140px"
                                  />
                                ) : (
                                  <div className="absolute inset-0 flex items-end p-2 bg-zinc-900">
                                    <span className="text-[10px] text-zinc-500 line-clamp-3 text-left">
                                      {result.title}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            <p className="mt-2 text-[11px] sm:text-xs font-medium text-zinc-400 leading-tight line-clamp-2 group-hover:text-white transition-colors">
                              {result.title}
                            </p>
                            {result.year ? (
                              <p className="text-[10px] text-zinc-600 mt-0.5">
                                {result.year}
                              </p>
                            ) : null}
                          </PrefetchLink>
                        )
                      })}
                    </div>
                  </ResultSection>
                ) : null}
              </>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )

  return <Layout>{body}</Layout>
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-black flex items-center justify-center">
          <BouncingBallsLoader size="lg" color="#FFD700" />
        </div>
      }
    >
      <SearchPageContent />
    </Suspense>
  )
}
