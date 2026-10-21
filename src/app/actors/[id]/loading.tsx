import { BouncingBallsLoader } from '@/components/ui/BouncingBallsLoader'

/**
 * Instant UX shell while the actor segment resolves.
 * The page itself loads via Prisma and always ships filmography + crawl shell
 * in the final HTML when data exists — this fallback must not be the only
 * content a completed Googlebot response contains.
 */
export default function ActorPageLoading() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center" aria-hidden>
      <BouncingBallsLoader size="lg" color="#FFD700" showText text="Loading..." />
    </div>
  )
}
