export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-black text-white" aria-hidden>
      <div className="h-16 sm:h-20 shrink-0 bg-[#0a0a0a] border-b border-white/5" />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 animate-pulse">
        <div className="h-12 w-full max-w-xl bg-white/10 rounded-xl mb-8" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-white/5 rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  )
}
