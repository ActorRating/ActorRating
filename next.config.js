/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Supabase from being bundled into server chunks (avoids ENOENT vendor-chunks)
  serverExternalPackages: ['@supabase/supabase-js', '@supabase/ssr'],
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  // Enable experimental features for better performance
  experimental: {
    optimizePackageImports: ['react-icons', 'framer-motion', 'lucide-react'],
    // Reduce bundle size by optimizing server components
    optimizeServerReact: true,
  },
  // Optimize images
  images: {
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 60,
    // Allow images from CDN if configured
    ...(process.env.CDN_BASE_URL && {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: new URL(process.env.CDN_BASE_URL).hostname,
        },
      ],
    }),
  },
  // CDN configuration for static assets (JS, CSS)
  ...(process.env.CDN_BASE_URL && {
    assetPrefix: process.env.CDN_BASE_URL.replace(/\/$/, ''),
  }),
}

module.exports = nextConfig