export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-black text-white" aria-hidden>
      <div className="h-16 sm:h-20 shrink-0 bg-[#0a0a0a] border-b border-white/5" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 animate-pulse">
        <div className="h-8 w-40 bg-white/10 rounded-lg mb-6" />
        <div className="h-32 w-full bg-white/5 rounded-2xl mb-8" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-48 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
