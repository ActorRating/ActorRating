'use client'

import { useState } from 'react'

interface MovieResult {
  title: string
  success: boolean
  message: string
}

export default function AddMoviesPage() {
  const [movieTitles, setMovieTitles] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isBackfilling, setIsBackfilling] = useState(false)
  const [results, setResults] = useState<MovieResult[]>([])
  const [backfillMessage, setBackfillMessage] = useState('')

  const handleFetchMovies = async () => {
    if (!movieTitles.trim()) {
      alert('Please enter at least one movie title')
      return
    }

    setIsLoading(true)
    setResults([])

    const titles = movieTitles
      .split('\n')
      .map((title) => title.trim())
      .filter((title) => title.length > 0)

    const newResults: MovieResult[] = []

    for (const title of titles) {
      try {
        const response = await fetch('/api/admin/fetch-movie', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title }),
        })

        const data = await response.json()

        if (response.ok) {
          newResults.push({
            title,
            success: true,
            message: data.message,
          })
        } else {
          newResults.push({
            title,
            success: false,
            message: data.error || 'Failed to fetch movie',
          })
        }
      } catch (error) {
        console.error(`Error processing ${title}:`, error)
        newResults.push({
          title,
          success: false,
          message: 'Network error occurred',
        })
      }

      setResults([...newResults])

      if (title !== titles[titles.length - 1]) {
        await new Promise((r) => setTimeout(r, 300))
      }
    }

    setIsLoading(false)
  }

  const handleBackfillIncomplete = async () => {
    setIsBackfilling(true)
    setBackfillMessage('')
    try {
      const response = await fetch('/api/admin/complete-incomplete-movies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ take: 40 }),
      })
      const data = await response.json()
      if (!response.ok) {
        setBackfillMessage(data.error || 'Backfill failed')
        return
      }
      setBackfillMessage(
        `Scanned ${data.scanned}, completed ${data.completed}` +
          (data.filmographyActorsExpanded
            ? `, expanded ${data.filmographyActorsExpanded} actor filmographies (+${data.filmographyMovieShellsCreated ?? 0} shells)`
            : '') +
          (data.failed?.length ? `, failed ${data.failed.length}` : '') +
          '. Run again if more remain.',
      )
    } catch {
      setBackfillMessage('Network error during backfill')
    } finally {
      setIsBackfilling(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Developer Tools - Add Movies
        </h1>
        <p className="text-muted-foreground">
          Adds each movie with full cast, performances, actor images, poster, and slug. Every newly
          created actor also gets their full TMDB filmography (can be slow for large casts).
        </p>
      </div>

      <div className="space-y-6">
        <div className="bg-secondary rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Add Movies</h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="movieTitles"
                className="block text-sm font-medium text-foreground mb-2"
              >
                Movie Titles (one per line)
              </label>
              <textarea
                id="movieTitles"
                value={movieTitles}
                onChange={(e) => setMovieTitles(e.target.value)}
                placeholder="Enter movie titles, one per line..."
                className="w-full h-32 px-3 py-2 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleFetchMovies}
              disabled={isLoading || !movieTitles.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Processing...' : 'Add Movies'}
            </button>
          </div>
        </div>

        <div className="bg-secondary rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Completeness backfill
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Fix movies already in the DB that are missing poster, slug, castIngestedAt, or system
            cast (up to 40 per run). Also expands TMDB filmography for cast members who still look
            unexpanded. Can be slow.
          </p>
          <button
            onClick={handleBackfillIncomplete}
            disabled={isBackfilling || isLoading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBackfilling ? 'Backfilling…' : 'Complete incomplete movies'}
          </button>
          {backfillMessage ? (
            <p className="mt-3 text-sm text-foreground">{backfillMessage}</p>
          ) : null}
        </div>

        {results.length > 0 && (
          <div className="bg-secondary rounded-lg border border-border p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Results</h2>
            <div className="space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.success
                      ? 'bg-green-500/10 border-green-500/20 text-green-600'
                      : 'bg-red-500/10 border-red-500/20 text-red-600'
                  }`}
                >
                  <div className="font-medium">{result.title}</div>
                  <div className="text-sm opacity-80">{result.message}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
