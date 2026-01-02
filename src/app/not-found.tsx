import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center space-y-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Logo href="/" />
        </div>

        {/* 404 Heading */}
        <div className="space-y-4">
          <h1 className="text-6xl sm:text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] via-[#FFD700] to-[#FFA500]">
            404
          </h1>
          <h2 className="text-2xl sm:text-3xl font-semibold text-white">
            Page Not Found
          </h2>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            The page you're looking for doesn't exist or has been moved. Let's get you back on track.
          </p>
        </div>

        {/* Navigation Links */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-4">
          <Link
            href="/"
            className="px-6 py-3 bg-gradient-to-r from-[#D4AF37] to-[#C9A961] text-black font-semibold rounded-lg hover:from-[#FFD700] hover:to-[#D4AF37] transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Go to Homepage
          </Link>
          <Link
            href="/rate"
            className="px-6 py-3 bg-[#1a1a1a] border border-[#333333] text-white font-semibold rounded-lg hover:bg-[#2a2a2a] hover:border-[#D4AF37] transition-all duration-200"
          >
            Rate a Performance
          </Link>
        </div>

        {/* Additional Helpful Links */}
        <div className="pt-8 border-t border-[#333333]">
          <p className="text-gray-500 text-sm mb-4">Popular Pages:</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link
              href="/performances"
              className="text-[#D4AF37] hover:text-[#FFD700] transition-colors"
            >
              Recent Performances
            </Link>
            <Link
              href="/search"
              className="text-[#D4AF37] hover:text-[#FFD700] transition-colors"
            >
              Search Actors
            </Link>
            <Link
              href="/about"
              className="text-[#D4AF37] hover:text-[#FFD700] transition-colors"
            >
              About
            </Link>
            <Link
              href="/dashboard"
              className="text-[#D4AF37] hover:text-[#FFD700] transition-colors"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
