import Link from 'next/link'
import { getTopRatedMovies, getTopRatedActors, getRecentlyRated } from '@/lib/home-seo-data'
import { getActorUrl, getMovieUrl, getRateUrl } from '@/lib/slugHelper'
import { isStaticProductionBuild } from '@/lib/is-static-build'

export const revalidate = 1800

export default async function HomeSeoLinkSections() {
  if (isStaticProductionBuild()) return null

  let topMovies: Awaited<ReturnType<typeof getTopRatedMovies>> = []
  let topActors: Awaited<ReturnType<typeof getTopRatedActors>> = []
  let recent: Awaited<ReturnType<typeof getRecentlyRated>> = []
  try {
    ;[topMovies, topActors, recent] = await Promise.all([
      getTopRatedMovies(12),
      getTopRatedActors(12),
      getRecentlyRated(12),
    ])
  } catch {
    /* DB unreachable (local dev without tunnel, Neon paused, etc.) — omit footer SEO lists */
    return null
  }

  if (!topMovies.length && !topActors.length && !recent.length) {
    return null
  }

  return (
    <section className="bg-black border-t border-white/10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 grid gap-10 lg:gap-12 md:grid-cols-3" aria-label="Top rated actors, movies, and performances">
        {/* Top Rated Movies */}
        <div>
          <h2 className="text-sm font-semibold tracking-[0.2em] uppercase text-gray-400 mb-4">
            Top Rated Movies
          </h2>
          <ul className="space-y-2 text-sm text-gray-300">
            {topMovies.slice(0, 12).map((movie) => (
              <li key={movie.id} className="truncate">
                <Link
                  href={
                    movie.year != null
                      ? getMovieUrl({
                          id: movie.id,
                          title: movie.title,
                          year: movie.year,
                          slug: movie.slug,
                        })
                      : `/movies/${movie.slug ?? movie.id}`
                  }
                  className="hover:text-[#FFD700] transition-colors"
                >
                  {movie.title}
                  {movie.year != null ? <span className="text-gray-500"> ({movie.year})</span> : null}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Top Rated Actors */}
        <div>
          <h2 className="text-sm font-semibold tracking-[0.2em] uppercase text-gray-400 mb-4">
            Top Rated Actors
          </h2>
          <ul className="space-y-2 text-sm text-gray-300">
            {topActors.slice(0, 12).map((actor) => (
              <li key={actor.id} className="truncate">
                <Link
                  href={getActorUrl({
                    id: actor.id,
                    name: actor.name,
                    slug: actor.slug,
                  })}
                  className="hover:text-[#FFD700] transition-colors"
                >
                  {actor.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Recently Rated */}
        <div>
          <h2 className="text-sm font-semibold tracking-[0.2em] uppercase text-gray-400 mb-4">
            Recently Rated
          </h2>
          <ul className="space-y-2 text-sm text-gray-300">
            {recent.slice(0, 12).map((item) => (
              <li key={item.id} className="truncate">
                <Link
                  href={
                    item.movie.year != null
                      ? getRateUrl(
                          {
                            id: item.actor.id,
                            name: item.actor.name,
                            slug: item.actor.slug,
                          },
                          {
                            id: item.movie.id,
                            title: item.movie.title,
                            year: item.movie.year,
                            slug: item.movie.slug,
                          }
                        )
                      : `/rate/${item.movie.slug ?? item.movie.id}/${item.actor.slug ?? item.actor.id}`
                  }
                  className="hover:text-[#FFD700] transition-colors"
                >
                  {item.actor.name}
                  {' in '}
                  <span className="italic">{item.movie.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-10 text-center">
        <Link
          href="/performances"
          className="text-sm text-gray-500 hover:text-[#FFD700] transition-colors underline underline-offset-4 decoration-gray-700 hover:decoration-[#FFD700]/50"
        >
          Explore all performances →
        </Link>
      </div>
    </section>
  )
}

