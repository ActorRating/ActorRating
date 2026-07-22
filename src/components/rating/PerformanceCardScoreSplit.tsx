/**
 * Compact score display for hub performance cards.
 * Never merges Critic Aggregate (TMDB film score) with Community (ActorRating).
 * Community is the product score — when present it leads visually.
 * On movie hubs, pass showCriticAggregate={false} — film TMDB score lives at page top only.
 */
export function PerformanceCardScoreSplit({
  seededAggregateScore,
  communityAvg10,
  communityRatingCount = 0,
  userScore10,
  showCriticAggregate = true,
}: {
  seededAggregateScore?: number | null
  communityAvg10?: number | null
  communityRatingCount?: number
  /** User's own score on 0–10 scale, if they rated this performance. */
  userScore10?: number | null
  /** When false, only Community (+ YOU) — used on movie hub cast cards. */
  showCriticAggregate?: boolean
}) {
  const hasSeeded =
    typeof seededAggregateScore === 'number' && Number.isFinite(seededAggregateScore)
  const hasCommunity =
    typeof communityAvg10 === 'number' &&
    Number.isFinite(communityAvg10) &&
    communityRatingCount > 0
  const hasUser =
    typeof userScore10 === 'number' && Number.isFinite(userScore10)

  return (
    <div className="w-full space-y-3">
      {hasUser && (
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#FFD700]/10 border border-[#FFD700]/25">
          <span
            className="text-lg font-bold text-[#FFD700] tabular-nums"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
          >
            {userScore10!.toFixed(1)}
          </span>
          <span className="text-[10px] font-semibold text-[#FFD700]/70 tracking-wide uppercase">
            You
          </span>
        </div>
      )}

      {showCriticAggregate ? (
        <div className="space-y-2.5">
          {/* Community leads — product score */}
          <div
            className={`rounded-md px-3.5 py-3 ${
              hasCommunity
                ? 'border border-[#FFD700]/30 bg-[#FFD700]/10'
                : 'border border-white/[0.08] bg-white/[0.03]'
            }`}
          >
            <p
              className={`text-[10px] font-bold tracking-[0.16em] uppercase mb-1 ${
                hasCommunity ? 'text-[#FFD700]/80' : 'text-zinc-500'
              }`}
            >
              Community
            </p>
            {hasCommunity ? (
              <>
                <div className="flex items-baseline gap-1.5">
                  <span
                    className="text-3xl sm:text-4xl font-black tabular-nums text-[#FFD700] leading-none"
                    style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
                  >
                    {Number(communityAvg10!.toFixed(1))}
                  </span>
                  <span className="text-sm font-semibold text-[#FFD700]/50">/10</span>
                </div>
                <p className="text-[11px] mt-1.5 text-zinc-500 tabular-nums">
                  {communityRatingCount}{' '}
                  {communityRatingCount === 1 ? 'ActorRating rating' : 'ActorRating ratings'}
                </p>
              </>
            ) : (
              <p className="text-sm font-medium text-zinc-500">Not yet rated</p>
            )}
          </div>

          {/* TMDB film score — secondary context */}
          <div className="rounded-md px-3 py-2 border border-white/[0.06] bg-transparent">
            <p className="text-[9px] font-bold tracking-[0.16em] uppercase mb-0.5 text-zinc-600">
              TMDB film score
            </p>
            {hasSeeded ? (
              <div className="flex items-baseline gap-1">
                <span className="text-base font-bold tabular-nums text-zinc-300">
                  {Number(seededAggregateScore!.toFixed(1))}
                </span>
                <span className="text-[10px] font-semibold text-zinc-600">/10</span>
              </div>
            ) : (
              <p className="text-xs font-medium text-zinc-600">Not available</p>
            )}
          </div>
        </div>
      ) : (
        <div
          className={`rounded-md px-3.5 py-3 ${
            hasCommunity
              ? 'border border-[#FFD700]/30 bg-[#FFD700]/10'
              : 'border border-white/[0.08] bg-white/[0.03]'
          }`}
        >
          <p
            className={`text-[10px] font-bold tracking-[0.16em] uppercase mb-1 ${
              hasCommunity ? 'text-[#FFD700]/80' : 'text-zinc-500'
            }`}
          >
            Community
          </p>
          {hasCommunity ? (
            <>
              <div className="flex items-baseline gap-1.5">
                <span
                  className="text-3xl sm:text-4xl font-black tabular-nums text-[#FFD700] leading-none"
                  style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
                >
                  {Number(communityAvg10!.toFixed(1))}
                </span>
                <span className="text-sm font-semibold text-[#FFD700]/50">/10</span>
              </div>
              <p className="text-[11px] mt-1.5 text-zinc-500 tabular-nums">
                {communityRatingCount}{' '}
                {communityRatingCount === 1 ? 'ActorRating rating' : 'ActorRating ratings'}
              </p>
            </>
          ) : (
            <p className="text-sm font-medium text-zinc-500">Not yet rated</p>
          )}
        </div>
      )}
    </div>
  )
}
