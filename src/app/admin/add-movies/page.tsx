'use client';

import { useState } from 'react';

interface MovieResult {
  title: string;
  success: boolean;
  message: string;
}

export default function AddMoviesPage() {
  const [movieTitles, setMovieTitles] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<MovieResult[]>([]);

  const handleFetchMovies = async () => {
    if (!movieTitles.trim()) {
      alert('Please enter at least one movie title');
      return;
    }

    setIsLoading(true);
    setResults([]);

    const titles = movieTitles
      .split('\n')
      .map(title => title.trim())
      .filter(title => title.length > 0);

    const newResults: MovieResult[] = [];

    for (const title of titles) {
      try {
        console.log(`Processing: ${title}`);
        
        const response = await fetch('/api/admin/fetch-movie', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title }),
        });

        const data = await response.json();

        if (response.ok) {
          if (data.exists) {
            newResults.push({
              title,
              success: false,
              message: data.message
            });
          } else {
            newResults.push({
              title,
              success: true,
              message: data.message
            });
          }
        } else {
          newResults.push({
            title,
            success: false,
            message: data.error || 'Failed to fetch movie'
          });
        }
      } catch (error) {
        console.error(`Error processing ${title}:`, error);
        newResults.push({
          title,
          success: false,
          message: 'Network error occurred'
        });
      }

      // Update results after each movie
      setResults([...newResults]);

      // Add 300ms delay between requests
      if (title !== titles[titles.length - 1]) {
        await new Promise(r => setTimeout(r, 300));
      }
    }

    setIsLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">
          Developer Tools - Add Movies
        </h1>
        <p className="text-muted-foreground">
          ⚠️ This is a developer-only tool for bulk adding movies to the database
        </p>
      </div>

      <div className="space-y-6">
        {/* Input Section */}
        <div className="bg-secondary rounded-lg border border-border p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Add Movies</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="movieTitles" className="block text-sm font-medium text-foreground mb-2">
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

        {/* Results Section */}
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
  );
} 