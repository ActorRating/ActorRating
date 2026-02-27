/** Minimal loading: thin top bar. PrefetchLink from Oscars/dashboard makes rate nav feel instant. */
export default function RatePageLoading() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[201] h-0.5 bg-[#FFD700]/80 animate-pulse" aria-hidden />
  )
}
