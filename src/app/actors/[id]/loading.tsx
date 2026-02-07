export default function ActorPageLoading() {
  return (
    <div className="min-h-screen bg-black text-white" aria-hidden>
      <div className="h-16 sm:h-20 shrink-0 bg-[#0a0a0a] border-b border-white/5" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-pulse">
        <div className="flex gap-6 items-start">
          <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-white/10 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-8 w-48 bg-white/10 rounded-lg mb-3" />
            <div className="h-4 w-32 bg-white/5 rounded mb-6" />
            <div className="h-24 bg-white/5 rounded-xl" />
          </div>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-36 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
