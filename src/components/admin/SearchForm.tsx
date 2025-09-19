'use client';

interface SearchParams {
  page?: string;
  limit?: string;
  search?: string;
  director?: string;
  year?: string;
  sortBy?: string;
  sortOrder?: string;
  dataStatus?: string;
}

export default function SearchForm({ searchParams, filters }: { searchParams: SearchParams, filters: any }) {
  const currentSearch = searchParams.search || '';
  const currentDirector = searchParams.director || '';
  const currentYear = searchParams.year || '';
  const currentSortBy = searchParams.sortBy || 'title';
  const currentSortOrder = searchParams.sortOrder || 'asc';
  const currentDataStatus = searchParams.dataStatus || '';

  return (
    <form method="GET" className="mb-6 space-y-4">
      {/* Search Bar */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label htmlFor="search" className="block text-sm font-medium text-foreground mb-2">
            Search Movies
          </label>
          <input
            type="text"
            id="search"
            name="search"
            defaultValue={currentSearch}
            placeholder="Search movies by title, director, or overview..."
            className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-input text-foreground placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
          >
            Search
          </button>
          <a
            href="/admin/movies"
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear All
          </a>
        </div>
      </div>

      {/* Filter Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {/* Director Filter */}
        <div>
          <label htmlFor="director" className="block text-sm font-medium text-foreground mb-2">
            Director
          </label>
          <select
            id="director"
            name="director"
            defaultValue={currentDirector}
            className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-input text-foreground"
          >
            <option value="">All Directors</option>
            {filters?.directors.map((director: string) => (
              <option key={director} value={director}>
                {director}
              </option>
            ))}
          </select>
        </div>

        {/* Year Filter */}
        <div>
          <label htmlFor="year" className="block text-sm font-medium text-foreground mb-2">
            Year
          </label>
          <select
            id="year"
            name="year"
            defaultValue={currentYear}
            className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-input text-foreground"
          >
            <option value="">All Years</option>
            {filters?.years.map((year: number) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        {/* Data Status Filter */}
        <div>
          <label htmlFor="dataStatus" className="block text-sm font-medium text-foreground mb-2">
            Data Status
          </label>
          <select
            id="dataStatus"
            name="dataStatus"
            defaultValue={currentDataStatus}
            className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-input text-foreground"
          >
            <option value="">All Movies</option>
            <option value="missing-data">Missing Data (No Actors/Performances)</option>
            <option value="has-data">Has Data (Has Actors/Performances)</option>
          </select>
        </div>

        {/* Sort Options */}
        <div>
          <label htmlFor="sortBy" className="block text-sm font-medium text-foreground mb-2">
            Sort By
          </label>
          <select
            id="sortBy"
            name="sortBy"
            defaultValue={currentSortBy}
            className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-input text-foreground"
          >
            <option value="title">Title</option>
            <option value="year">Year</option>
            <option value="director">Director</option>
          </select>
        </div>

        {/* Sort Order */}
        <div>
          <label htmlFor="sortOrder" className="block text-sm font-medium text-foreground mb-2">
            Sort Order
          </label>
          <select
            id="sortOrder"
            name="sortOrder"
            defaultValue={currentSortOrder}
            className="w-full px-3 py-2 border border-border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-input text-foreground"
          >
            <option value="asc">Ascending</option>
            <option value="desc">Descending</option>
          </select>
        </div>
      </div>
    </form>
  );
} 