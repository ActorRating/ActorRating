/** Minimal loading: thin top bar only. Navbar prefetches /dashboard so transition stays fast; no full-page overlay. */
export default function DashboardLoading() {
  return (
    <div className="fixed top-0 left-0 right-0 z-[201] h-0.5 bg-[#FFD700]/80 animate-pulse" aria-hidden />
  )
}
