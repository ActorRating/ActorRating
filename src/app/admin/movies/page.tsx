import { prisma } from "@/lib/prisma";
import MoviesTable from "@/components/admin/MoviesTable";
import SearchForm from "@/components/admin/SearchForm";
import { Suspense } from "react";

interface Movie {
  id: string;
  title: string;
  year: number;
  director: string;
  overview: string | null;
  tmdbId: number | null;
  _count: {
    performances: number;
    actors: number;
  };
}

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

async function getMovies(searchParams: SearchParams) {
  const page = parseInt(searchParams.page || '1');
  const limit = parseInt(searchParams.limit || '20');
  const search = searchParams.search || '';
  const director = searchParams.director || '';
  const year = searchParams.year || '';
  const sortBy = searchParams.sortBy || 'title';
  const sortOrder = searchParams.sortOrder || 'asc';
  const dataStatus = searchParams.dataStatus || '';

  // Build where clause
  const where: any = {};

  if (search) {
    // Create a more flexible search that matches partial words
    const searchLower = search.toLowerCase();
    where.OR = [
      { title: { contains: searchLower, mode: 'insensitive' } },
      { director: { contains: searchLower, mode: 'insensitive' } },
      { overview: { contains: searchLower, mode: 'insensitive' } },
      // Also search for individual words
      ...searchLower.split(/\s+/).filter(term => term.length > 2).map(term => ({
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { director: { contains: term, mode: 'insensitive' } },
          { overview: { contains: term, mode: 'insensitive' } }
        ]
      }))
    ];
  }

  if (director) {
    where.director = { contains: director, mode: 'insensitive' };
  }

  if (year) {
    where.year = parseInt(year);
  }

  // Build order by clause
  const orderBy: any = {};
  // Handle the case where sortBy might be "title-asc" instead of just "title"
  const cleanSortBy = sortBy.split('-')[0]; // Remove any suffix like "-asc"
  orderBy[cleanSortBy] = sortOrder;

  // Get total count for pagination (before data status filtering)
  const totalCount = await prisma.movie.count({ where });

  // Get movies with pagination
  const movies = await prisma.movie.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
    include: {
      _count: {
        select: {
          performances: true
        }
      }
    }
  });

  // Get actor counts for each movie
  const moviesWithActorCounts = await Promise.all(
    movies.map(async (movie: Movie) => {
      const actorCount = await prisma.performance.groupBy({
        by: ['actorId'],
        where: { movieId: movie.id },
        _count: {
          actorId: true
        }
      });

      return {
        ...movie,
        _count: {
          ...movie._count,
          actors: actorCount.length
        }
      };
    })
  );

  return {
    movies: moviesWithActorCounts,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit)
    }
  };
}

function Pagination({ pagination, searchParams }: { pagination: any, searchParams: SearchParams }) {
  const createPageUrl = (page: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value && key !== 'page') {
        params.set(key, value);
      }
    });
    params.set('page', page.toString());
    return `?${params.toString()}`;
  };

  return (
    <div className="flex items-center justify-between mt-6">
      <div className="text-sm text-muted-foreground">
        Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} movies
      </div>
      <div className="flex gap-2">
        {pagination.page > 1 && (
          <a
            href={createPageUrl(pagination.page - 1)}
            className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Previous
          </a>
        )}
        {pagination.page < pagination.totalPages && (
          <a
            href={createPageUrl(pagination.page + 1)}
            className="px-3 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Next
          </a>
        )}
      </div>
    </div>
  );
}

export default async function AdminMoviesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const resolvedSearchParams = await searchParams;
  const { movies, pagination } = await getMovies(resolvedSearchParams);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-4">Admin - Movies</h1>
        <p className="text-muted-foreground">
          Manage movies in the database. Search, filter, and view performance data.
        </p>
      </div>

      <div className="space-y-6">
        <Suspense fallback={<div>Loading search form...</div>}>
          <SearchForm />
        </Suspense>

        <Suspense fallback={<div>Loading movies table...</div>}>
          <MoviesTable movies={movies} />
        </Suspense>

        <Pagination pagination={pagination} searchParams={resolvedSearchParams} />
      </div>
    </div>
  );
} 