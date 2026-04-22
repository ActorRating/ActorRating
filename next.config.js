/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_GOOGLE_OAUTH_AVAILABLE:
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET ? "1" : "",
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Required for Docker / Coolify: produce `.next/standalone` and run `node server.js`
  // there instead of `next start`, so the same traced server handles cookies and auth.
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
    minimumCacheTTL: 3600, // 1 hour — TMDB images are stable
    remotePatterns: [
      // TMDB actor headshots + movie posters
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        pathname: '/t/p/**',
      },
      // CDN if configured
      ...(process.env.CDN_BASE_URL
        ? [{ protocol: 'https', hostname: new URL(process.env.CDN_BASE_URL).hostname }]
        : []),
    ],
  },
  // CDN configuration for static assets (JS, CSS)
  ...(process.env.CDN_BASE_URL && {
    assetPrefix: process.env.CDN_BASE_URL.replace(/\/$/, ''),
  }),

  async headers() {
    // Avoid breaking local dev with strict policies. Apply in production only.
    if (process.env.NODE_ENV !== 'production') return []

    // Permissive-but-targeted CSP to prevent breakage:
    // - Allow inline scripts/styles because Next injects inline bootstrap code.
    // - Whitelist the external domains your app actually calls/loads in the browser.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      // If reCAPTCHA uses an iframe internally, allow it.
      "frame-src 'self' https://www.google.com",

      // Scripts: Google Analytics, reCAPTCHA, Vercel Analytics/Speed Insights
      // 'unsafe-eval' helps some Next/runtime tooling and packages; keep with 'unsafe-inline' for Next bootstrap
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.googletagmanager.com https://www.google.com https://www.gstatic.com https://va.vercel-scripts.com",

      // Styles: inline for Next + Google Fonts CSS
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

      // Fonts: self/data + Google Fonts
      "font-src 'self' data: https://fonts.gstatic.com",

      // Images: blob: for generated previews; self/data + TMDB + S3/CDN
      "img-src 'self' data: blob: https://image.tmdb.org https://actorrating.com https://*.amazonaws.com",

      // Video/audio previews if ever used
      "media-src 'self' blob: data:",

      // XHR/fetch/WebSocket: GA + reCAPTCHA + Formspree + Vercel telemetry + S3
      "connect-src 'self' https://www.google.com https://accounts.google.com https://oauth2.googleapis.com https://www.google-analytics.com https://www.googletagmanager.com https://formspree.io https://va.vercel-scripts.com https://vitals.vercel-insights.com https://insights.vercel.com https://*.amazonaws.com",

      "worker-src 'self'",
    ].join('; ')

    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}

module.exports = nextConfig