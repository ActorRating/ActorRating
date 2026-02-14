import { BouncingBallsLoader } from "@/components/ui/BouncingBallsLoader"

export default function PerformancesLoading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center pt-16" aria-hidden>
      <BouncingBallsLoader size="lg" color="#FFD700" showText text="Loading..." />
    </div>
  )
}
