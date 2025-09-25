"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronDown, 
  ChevronRight, 
  Filter, 
  Star, 
  Clock, 
  Award, 
  Calendar,
  Film,
  User,
  TrendingUp,
  Heart,
  Eye,
  X,
  Settings
} from 'lucide-react'
import { useUser } from '@supabase/auth-helpers-react'
import { Button } from '../ui/Button'
import { cn } from '@/lib/utils'

interface SidebarProps {
  isOpen: boolean
  onToggle: (collapsed: boolean) => void
  variant?: 'desktop' | 'mobile'
}

interface FilterOption {
  id: string
  label: string
  count?: number
  icon?: React.ComponentType<{ className?: string }>
}

interface CategorySection {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  items: FilterOption[]
  isCollapsible?: boolean
}

export function Sidebar({ isOpen, onToggle, variant = 'desktop' }: SidebarProps) {
  const pathname = usePathname()
  const user = useUser()
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [selectedFilters, setSelectedFilters] = useState<Set<string>>(new Set())
  const [recentPerformances, setRecentPerformances] = useState<any[]>([])
  const [userRatings, setUserRatings] = useState<any[]>([])

  // Mock data - replace with actual API calls
  const performanceFilters: CategorySection[] = [
    {
      id: 'year',
      title: 'Year',
      icon: Calendar,
      items: [
        { id: '2024', label: '2024', count: 45 },
        { id: '2023', label: '2023', count: 128 },
        { id: '2022', label: '2022', count: 156 },
        { id: '2021', label: '2021', count: 134 },
        { id: '2020', label: '2020', count: 98 },
      ]
    },
    {
      id: 'genre',
      title: 'Genre',
      icon: Film,
      items: [
        { id: 'drama', label: 'Drama', count: 234 },
        { id: 'comedy', label: 'Comedy', count: 156 },
        { id: 'action', label: 'Action', count: 89 },
        { id: 'thriller', label: 'Thriller', count: 123 },
        { id: 'romance', label: 'Romance', count: 67 },
      ]
    },
    {
      id: 'awards',
      title: 'Awards',
      icon: Award,
      items: [
        { id: 'oscar-nominated', label: 'Oscar Nominated', count: 23 },
        { id: 'oscar-winner', label: 'Oscar Winner', count: 12 },
        { id: 'golden-globe', label: 'Golden Globe', count: 34 },
        { id: 'bafta', label: 'BAFTA', count: 28 },
      ]
    },
    {
      id: 'performance-type',
      title: 'Performance Type',
      icon: User,
      items: [
        { id: 'lead', label: 'Lead Role', count: 189 },
        { id: 'supporting', label: 'Supporting Role', count: 245 },
        { id: 'ensemble', label: 'Ensemble', count: 67 },
      ]
    }
  ]

  const quickActions = [
    { id: 'trending', label: 'Trending Now', icon: TrendingUp, href: '/performances?filter=trending' },
    { id: 'top-rated', label: 'Top Rated', icon: Star, href: '/performances?filter=top-rated' },
    { id: 'recent', label: 'Recently Added', icon: Clock, href: '/performances?filter=recent' },
    { id: 'favorites', label: 'My Favorites', icon: Heart, href: '/performances?filter=favorites' },
  ]

  // Toggle section collapse
  const toggleSection = (sectionId: string) => {
    const newCollapsed = new Set(collapsedSections)
    if (newCollapsed.has(sectionId)) {
      newCollapsed.delete(sectionId)
    } else {
      newCollapsed.add(sectionId)
    }
    setCollapsedSections(newCollapsed)
  }

  // Toggle filter selection
  const toggleFilter = (filterId: string) => {
    const newSelected = new Set(selectedFilters)
    if (newSelected.has(filterId)) {
      newSelected.delete(filterId)
    } else {
      newSelected.add(filterId)
    }
    setSelectedFilters(newSelected)
  }

  // Clear all filters
  const clearFilters = () => {
    setSelectedFilters(new Set())
  }

  // Load user data
  useEffect(() => {
    if (user) {
      // Mock data - replace with actual API calls
      setRecentPerformances([
        { id: 1, title: 'The Dark Knight', actor: 'Heath Ledger', rating: 9.2 },
        { id: 2, title: 'There Will Be Blood', actor: 'Daniel Day-Lewis', rating: 8.9 },
        { id: 3, title: 'Joker', actor: 'Joaquin Phoenix', rating: 8.7 },
      ])
      
      setUserRatings([
        { id: 1, title: 'The Dark Knight', actor: 'Heath Ledger', rating: 9.5, date: '2024-01-15' },
        { id: 2, title: 'There Will Be Blood', actor: 'Daniel Day-Lewis', rating: 9.0, date: '2024-01-10' },
        { id: 3, title: 'Joker', actor: 'Joaquin Phoenix', rating: 8.8, date: '2024-01-05' },
      ])
    }
  }, [user])

  const sidebarWidth = isOpen ? 'w-80' : 'w-16'
  const isCollapsed = !isOpen

  return (
    <aside className={cn(
      "bg-secondary/50 backdrop-blur-sm border-r border-border flex flex-col transition-all duration-300",
      sidebarWidth,
      variant === 'mobile' && "w-80"
    )}>
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <h2 className={cn(
            "font-semibold text-foreground transition-opacity",
            isCollapsed ? "opacity-0" : "opacity-100"
          )}>
            Filters & Navigation
          </h2>
          <button
            onClick={() => onToggle(!isOpen)}
            className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            <ChevronRight className={cn(
              "w-4 h-4 transition-transform",
              isOpen && "rotate-180"
            )} />
          </button>
        </div>
      </div>

      {/* Sidebar Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-6">
          {/* Quick Actions */}
          <div className={cn(
            "transition-opacity",
            isCollapsed ? "opacity-0" : "opacity-100"
          )}>
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon
                return (
                  <Link
                    key={`sidebar-quick-action-${action.id}`}
                    href={action.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {action.label}
                  </Link>
                )
              })}
            </div>
          </div>

          {/* Performance Filters */}
          <div className={cn(
            "transition-opacity",
            isCollapsed ? "opacity-0" : "opacity-100"
          )}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </h3>
              {selectedFilters.size > 0 && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  Clear all
                </button>
              )}
            </div>

            <div className="space-y-4">
              {performanceFilters.map((section) => {
                const Icon = section.icon
                const isCollapsed = collapsedSections.has(section.id)
                
                return (
                  <div key={`sidebar-section-${section.id}`} className="border border-border rounded-lg">
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors rounded-t-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {section.title}
                      </div>
                      <ChevronDown className={cn(
                        "w-4 h-4 transition-transform",
                        isCollapsed && "rotate-180"
                      )} />
                    </button>
                    
                    <AnimatePresence>
                      {!isCollapsed && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-3 space-y-1">
                            {section.items.map((item) => (
                              <button
                                key={`sidebar-filter-item-${item.id}`}
                                onClick={() => toggleFilter(item.id)}
                                className={cn(
                                  "w-full flex items-center justify-between px-2 py-1.5 rounded text-sm transition-colors",
                                  selectedFilters.has(item.id)
                                    ? "text-primary bg-primary/10"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                              >
                                <span>{item.label}</span>
                                {item.count && (
                                  <span className="text-xs text-muted-foreground">
                                    {item.count}
                                  </span>
                                )}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Recently Viewed */}
          {user && recentPerformances.length > 0 && (
            <div className={cn(
              "transition-opacity",
              isCollapsed ? "opacity-0" : "opacity-100"
            )}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Eye className="w-4 h-4" />
                Recently Viewed
              </h3>
              <div className="space-y-2">
                {recentPerformances.map((performance) => (
                  <Link
                    key={`sidebar-performance-${performance.id}`}
                    href={`/performances/${performance.id}`}
                    className="block p-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <div className="font-medium">{performance.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {performance.actor} • {performance.rating}/10
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* User's Rating History */}
          {user && userRatings.length > 0 && (
            <div className={cn(
              "transition-opacity",
              isCollapsed ? "opacity-0" : "opacity-100"
            )}>
              <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                <Star className="w-4 h-4" />
                My Ratings
              </h3>
              <div className="space-y-2">
                {userRatings.slice(0, 5).map((rating) => (
                  <Link
                    key={`sidebar-rating-${rating.id}`}
                    href={`/performances/${rating.id}`}
                    className="block p-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{rating.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {rating.actor}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-medium">{rating.rating}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sidebar Footer */}
      {user && (
        <div className={cn(
          "p-4 border-t border-border transition-opacity",
          isCollapsed ? "opacity-0" : "opacity-100"
        )}>
          <Link href="/settings">
            <Button variant="ghost" size="sm" className="w-full justify-start">
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </Link>
        </div>
      )}

      {/* Collapsed State Icons */}
      {isCollapsed && (
        <div className="p-2 space-y-2">
          {quickActions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={`sidebar-collapsed-action-${action.id}`}
                href={action.href}
                className="block p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title={action.label}
              >
                <Icon className="w-5 h-5" />
              </Link>
            )
          })}
        </div>
      )}
    </aside>
  )
} 