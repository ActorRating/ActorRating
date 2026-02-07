export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-black text-white" aria-hidden>
      <div className="h-16 sm:h-20 shrink-0 bg-[#0a0a0a] border-b border-white/5" />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 animate-pulse">
        <div className="h-10 w-48 bg-white/10 rounded-lg mb-8" />
        <div className="space-y-6">
          <div className="h-24 bg-white/5 rounded-xl" />
          <div className="h-24 bg-white/5 rounded-xl" />
          <div className="h-24 bg-white/5 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
