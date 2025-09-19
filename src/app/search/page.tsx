export const dynamic = 'force-dynamic'

import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SignedInLayout } from "@/components/layout"
import { SearchBar } from "@/components/SearchBar"

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/auth/signin")
  }

  const resolvedSearchParams = await searchParams
  const query = resolvedSearchParams.q || ""

  return (
    <SignedInLayout>
      <div className="min-h-screen bg-background relative overflow-hidden">
        {/* Subtle background elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-background to-accent/3" />
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 min-h-screen flex flex-col justify-start pt-16">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="text-center mb-8 sm:mb-12">
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-3 sm:mb-4">
                <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                  Search
                </span>
                <span className="text-foreground"> & Discover</span>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Find actors and movies to rate with our comprehensive database
              </p>
            </div>
            
            <div className="max-w-2xl mx-auto mb-12 sm:mb-16">
              <SearchBar 
                placeholder="Search for actors, movies, or performances..." 
                className="text-lg shadow-2xl" 
                autoFocus 
                initialValue={query}
              />
            </div>

            {/* Search Results */}
            {query && (
              <div className="text-center py-12">
                <p className="text-muted-foreground text-lg mb-2">
                  Search results for "{query}" will be displayed here
                </p>
                <p className="text-muted-foreground text-sm">
                  The search functionality is working - you can see suggestions in the dropdown above
                </p>
              </div>
            )}
            
          </div>
        </div>
      </div>
    </SignedInLayout>
  )
}