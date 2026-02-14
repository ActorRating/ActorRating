"use client"

import { createContext, useContext, useState, useCallback, useEffect } from "react"
import { BouncingBallsLoader } from "@/components/ui/BouncingBallsLoader"

type NavigationProgressContextType = {
  startNavigation: () => void
  endNavigation: () => void
}

const NavigationProgressContext = createContext<NavigationProgressContextType>({
  startNavigation: () => {},
  endNavigation: () => {},
})

export function useNavigationProgress() {
  return useContext(NavigationProgressContext)
}

export function NavigationProgressProvider({ children }: { children: React.ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false)

  const startNavigation = useCallback(() => {
    setIsNavigating(true)
  }, [])

  const endNavigation = useCallback(() => {
    setIsNavigating(false)
  }, [])

  // Safety: clear overlay after 5s so we never get stuck if a page forgets to call endNavigation
  useEffect(() => {
    if (!isNavigating) return
    const t = setTimeout(() => setIsNavigating(false), 5000)
    return () => clearTimeout(t)
  }, [isNavigating])

  return (
    <NavigationProgressContext.Provider value={{ startNavigation, endNavigation }}>
      {children}
      {isNavigating && (
        <div
          className="fixed inset-0 z-[200] bg-black flex items-center justify-center"
          aria-hidden
          aria-busy="true"
        >
          <BouncingBallsLoader size="lg" color="#FFD700" showText text="Loading..." />
        </div>
      )}
    </NavigationProgressContext.Provider>
  )
}
