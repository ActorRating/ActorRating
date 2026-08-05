/** Thin progress only — avoid a full-page “Loading rating page…” shell that HTML-only bots capture. */
export default function RateSegmentLoading() {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[201] h-0.5 bg-[#FFD700]/80 animate-pulse"
      aria-hidden
    />
  )
}
