"use client"

export const dynamic = "force-dynamic"

import { useSearchParams } from "next/navigation"
import { useUser } from "@/components/providers/SessionProvider"
import { SignedInLayout, HomeLayout } from "@/components/layout"
import { SearchBar } from "@/components/SearchBar"

export default function SearchPage() {
  const searchParams = useSearchParams()
  const user = useUser()
  const query = searchParams?.get('q') || ""

  const SearchContent = () => (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle background elements */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-background to-accent/3" />
      <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-accent/5 rounded-full blur-3xl" />
      
      <div className="relative z-10 min-h-screen flex flex-col justify-start pt-12 sm:pt-16">
        <div className="max-w-7xl mx-auto px-4 py-8 sm:py-12 lg:py-16">
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8 lg:col-start-3 text-center mb-8 sm:mb-12 lg:mb-16">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 lg:mb-8">
                <span className="text-primary">
                  Search
                </span>
                <span className="text-white"> & Discover</span>
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4">
                Find actors to rate with our comprehensive database
              </p>
            </div>
            
            <div className="col-span-12 lg:col-span-8 lg:col-start-3 mb-8 sm:mb-12 lg:mb-16">
              <SearchBar 
                placeholder="Search for actors..." 
                className="text-base sm:text-lg shadow-2xl" 
                autoFocus 
                initialValue={query}
              />
            </div>

            {/* Search Results */}
            {query && (
              <div className="col-span-12 text-center py-8 sm:py-12 px-4">
                <p className="text-muted-foreground text-base sm:text-lg mb-2">
                  Search results for "{query}" will be displayed here
                </p>
                <p className="text-muted-foreground text-sm sm:text-base max-w-md mx-auto">
                  The search functionality is working - you can see suggestions in the dropdown above
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )

  return user ? (
    <SignedInLayout>
      <SearchContent />
    </SignedInLayout>
  ) : (
    <HomeLayout>
      <SearchContent />
    </HomeLayout>
  )
}
