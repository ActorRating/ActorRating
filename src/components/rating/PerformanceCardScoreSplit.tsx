/**
 * Compact score display for hub performance cards.
 * Never merges Critic Aggregate with Community.
 * On movie hubs, pass showCriticAggregate={false} — film critic score lives at page top only.
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
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-[#FFD700]/20 to-[#FFA500]/15 border border-[#FFD700]/40">
          <span
            className="text-xl sm:text-2xl font-bold text-[#FFD700] tabular-nums"
            style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
          >
            {userScore10!.toFixed(1)}
          </span>
          <span className="text-xs font-semibold text-[#FFD700]/55 tracking-wide">YOU</span>
        </div>
      )}

      {showCriticAggregate ? (
        <div
          className="grid grid-cols-2 gap-3 rounded-xl px-3 py-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <div>
            <p className="text-[9px] font-bold tracking-[0.16em] uppercase mb-1" style={{ color: '#71717a' }}>
              Critic Aggregate
            </p>
            {hasSeeded ? (
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-black tabular-nums text-white">
                  {Number(seededAggregateScore!.toFixed(1))}
                </span>
                <span className="text-[10px] font-semibold" style={{ color: '#52525b' }}>/10</span>
              </div>
            ) : (
              <p className="text-xs font-medium" style={{ color: '#a1a1aa' }}>
                Not yet rated
              </p>
            )}
          </div>
          <div>
            <p className="text-[9px] font-bold tracking-[0.16em] uppercase mb-1" style={{ color: '#71717a' }}>
              Community
            </p>
            {hasCommunity ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-lg sm:text-xl font-black tabular-nums" style={{ color: '#FFD700' }}>
                    {Number(communityAvg10!.toFixed(1))}
                  </span>
                  <span className="text-[10px] font-semibold" style={{ color: '#52525b' }}>/10</span>
                </div>
                <p className="text-[10px] mt-0.5 tabular-nums" style={{ color: '#52525b' }}>
                  {communityRatingCount} {communityRatingCount === 1 ? 'rating' : 'ratings'}
                </p>
              </>
            ) : (
              <p className="text-xs font-medium" style={{ color: '#a1a1aa' }}>
                Not yet rated
              </p>
            )}
          </div>
        </div>
      ) : (
        <div
          className="rounded-xl px-3 py-3"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <p className="text-[9px] font-bold tracking-[0.16em] uppercase mb-1" style={{ color: '#71717a' }}>
            Community Rating
          </p>
          {hasCommunity ? (
            <>
              <div className="flex items-baseline gap-1">
                <span className="text-lg sm:text-xl font-black tabular-nums" style={{ color: '#FFD700' }}>
                  {Number(communityAvg10!.toFixed(1))}
                </span>
                <span className="text-[10px] font-semibold" style={{ color: '#52525b' }}>/10</span>
              </div>
              <p className="text-[10px] mt-0.5 tabular-nums" style={{ color: '#52525b' }}>
                {communityRatingCount} {communityRatingCount === 1 ? 'rating' : 'ratings'}
              </p>
            </>
          ) : (
            <p className="text-xs font-medium" style={{ color: '#a1a1aa' }}>
              Not yet rated
            </p>
          )}
        </div>
      )}
    </div>
  )
}
