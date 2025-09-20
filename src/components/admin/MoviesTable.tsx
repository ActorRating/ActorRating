'use client';

interface Movie {
  id: string;
  title: string;
  year: number;
  director: string | null;
  overview: string | null;
  tmdbId: number | null;
  _count: {
    performances: number;
    actors: number;
  };
}

export default function MoviesTable({ movies, sortBy, sortOrder }: { movies: Movie[], sortBy: string, sortOrder: string }) {
  const handleSort = (field: string) => {
    const newSortOrder = sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc';
    const params = new URLSearchParams(window.location.search);
    params.set('sortBy', field);
    params.set('sortOrder', newSortOrder);
    window.location.search = params.toString();
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead className="bg-muted/50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70" onClick={() => handleSort('title')}>
              Title
              {sortBy === 'title' && (
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70" onClick={() => handleSort('year')}>
              Year
              {sortBy === 'year' && (
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted/70" onClick={() => handleSort('director')}>
              Director
              {sortBy === 'director' && (
                <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
              )}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Summary
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Overview
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {movies.map((movie) => (
                            <tr key={`admin-movie-${movie.id}`} className="hover:bg-muted/30">
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm font-medium text-foreground">{movie.title}</div>
                {movie.tmdbId && (
                  <div className="text-xs text-muted-foreground">TMDB: {movie.tmdbId}</div>
                )}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                {movie.year}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                {movie.director || 'Unknown'}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-foreground">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Actors:</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      movie._count.actors === 0 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {movie._count.actors}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Performances:</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      movie._count.performances === 0 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {movie._count.performances}
                    </span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-sm text-muted-foreground">
                <div className="max-w-xs truncate">
                  {movie.overview || 'No overview available'}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
} 