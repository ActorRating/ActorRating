"use client"

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, SortAsc, Loader2, Inbox } from 'lucide-react'
import { Performance } from '@/types'
import { PerformanceCard } from './PerformanceCard'
import { Button } from '../ui/Button'
import { fadeInUp, staggerContainer, getMotionProps } from '@/lib/animations'

interface PerformanceGridProps {
  performances: Performance[]
  loading?: boolean
  hasMore?: boolean
  onLoadMore?: () => void
  onSort?: (sortBy: string, direction: 'asc' | 'desc') => void
  onFilter?: (filters: FilterOptions) => void
  className?: string
  variant?: 'default' | 'featured' | 'compact'
  emptyMessage?: string
}

interface FilterOptions {
  minRating?: number
  maxRating?: number
  performanceType?: 'lead' | 'supporting' | 'all'
  yearRange?: { min?: number; max?: number }
  genres?: string[]
}

interface SortOption {
  key: string
  label: string
  direction: 'asc' | 'desc'
}

const SORT_OPTIONS: SortOption[] = [
  { key: 'rating', label: 'Rating', direction: 'desc' },
  { key: 'year', label: 'Year', direction: 'desc' },
  { key: 'actor', label: 'Actor', direction: 'asc' },
  { key: 'movie', label: 'Movie', direction: 'asc' },
  { key: 'created', label: 'Recently Added', direction: 'desc' }
]

export function PerformanceGrid({
  performances,
  loading = false,
  hasMore = false,
  onLoadMore,
  onSort,
  onFilter,
  className = '',
  variant = 'default',
  emptyMessage = 'No performances found'
}: PerformanceGridProps) {
  const [sortBy, setSortBy] = useState<string>('rating')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<FilterOptions>({})
  const [searchQuery, setSearchQuery] = useState('')

  const gridVariants = {
    default: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5",
    featured: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
    compact: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6"
  }

  const gapVariants = {
    default: "gap-5 sm:gap-6 lg:gap-8 xl:gap-10",
    featured: "gap-6 lg:gap-8 xl:gap-10",
    compact: "gap-4 sm:gap-4 lg:gap-6"
  }

  const handleSort = useCallback((option: SortOption) => {
    setSortBy(option.key)
    setSortDirection(option.direction)
    onSort?.(option.key, option.direction)
  }, [onSort])

  const handleFilterChange = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters)
    onFilter?.(newFilters)
  }, [onFilter])

  const filteredPerformances = performances.filter(performance => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      const actorName = performance.actor?.name?.toLowerCase() || ''
      const movieTitle = performance.movie?.title?.toLowerCase() || ''
      if (!actorName.includes(query) && !movieTitle.includes(query)) {
        return false
      }
    }
    return true
  })

  const LoadingSkeleton = () => (
    <div className="bg-card rounded-2xl border border-border p-6 animate-pulse">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="h-6 bg-muted rounded mb-2 w-3/4"></div>
          <div className="h-4 bg-muted rounded mb-2 w-1/2"></div>
          <div className="h-3 bg-muted rounded w-1/3"></div>
        </div>
        <div className="text-right">
          <div className="h-8 bg-muted rounded w-12 mb-1"></div>
          <div className="h-3 bg-muted rounded w-16"></div>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex justify-between items-center">
            <div className="h-3 bg-muted rounded w-20"></div>
            <div className="h-3 bg-muted rounded w-8"></div>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="h-10 bg-muted rounded flex-1"></div>
        <div className="h-10 bg-muted rounded w-20"></div>
      </div>
    </div>
  )

  const EmptyState = () => (
    <motion.div
      variants={fadeInUp}
      {...getMotionProps()}
      className="col-span-full flex flex-col items-center justify-center py-12 text-center"
    >
      <Inbox className="w-16 h-16 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-2">
        {emptyMessage}
      </h3>
      <p className="text-muted-foreground max-w-md">
        Try adjusting your search or filters to find what you're looking for.
      </p>
    </motion.div>
  )

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search performances..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
          />
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            Filters
          </Button>
          
          <div className="relative">
            <select
              value={`${sortBy}-${sortDirection}`}
              onChange={(e) => {
                const [key, direction] = e.target.value.split('-')
                handleSort({ key, label: '', direction: direction as 'asc' | 'desc' })
              }}
              className="appearance-none bg-background border border-border rounded-lg px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            >
              {SORT_OPTIONS.map(option => (
                <option key={`${option.key}-${option.direction}`} value={`${option.key}-${option.direction}`}>
                  {option.label} {option.direction === 'asc' ? '↑' : '↓'}
                </option>
              ))}
            </select>
            <SortAsc className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Filter Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-card border border-border rounded-lg p-4 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Rating Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    min="0"
                    max="100"
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    onChange={(e) => handleFilterChange({ ...filters, minRating: Number(e.target.value) })}
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    min="0"
                    max="100"
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    onChange={(e) => handleFilterChange({ ...filters, maxRating: Number(e.target.value) })}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Performance Type
                </label>
                <select
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  onChange={(e) => handleFilterChange({ ...filters, performanceType: e.target.value as any })}
                >
                  <option value="all">All Types</option>
                  <option value="lead">Lead</option>
                  <option value="supporting">Supporting</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Year Range
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="From"
                    min="1900"
                    max="2030"
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    onChange={(e) => handleFilterChange({ 
                      ...filters, 
                      yearRange: { ...filters.yearRange, min: Number(e.target.value) }
                    })}
                  />
                  <input
                    type="number"
                    placeholder="To"
                    min="1900"
                    max="2030"
                    className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    onChange={(e) => handleFilterChange({ 
                      ...filters, 
                      yearRange: { ...filters.yearRange, max: Number(e.target.value) }
                    })}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Performance Grid */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className={`grid ${gridVariants[variant]} ${gapVariants[variant]}`}
      >
        {loading ? (
          // Loading skeletons
          [...Array(8)].map((_, index) => (
            <motion.div
              key={`skeleton-${index}`}
              variants={fadeInUp}
            >
              <LoadingSkeleton />
            </motion.div>
          ))
        ) : filteredPerformances.length === 0 ? (
          <EmptyState />
        ) : (
          // Performance cards
          filteredPerformances.map((performance, index) => (
            <motion.div
              key={`performance-${performance.id}`}
              variants={fadeInUp}
              className="h-full"
            >
              <PerformanceCard
                performance={performance}
                variant={variant}
                onClick={() => {
                  // Handle navigation or modal opening
                  window.location.href = `/performances/${performance.id}`
                }}
              />
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Load More Button */}
      {hasMore && !loading && (
        <div className="flex justify-center pt-6">
          <Button
            onClick={onLoadMore}
            variant="outline"
            className="flex items-center gap-2"
          >
            Load More Performances
          </Button>
        </div>
      )}

      {/* Loading indicator for load more */}
      {loading && hasMore && (
        <div className="flex justify-center pt-6">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading more performances...
          </div>
        </div>
      )}
    </div>
  )
} 