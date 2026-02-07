import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'

export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center" aria-hidden>
      <BouncingBallsLoader size="lg" color="#FFD700" showText text="Loading..." />
    </div>
  )
}
