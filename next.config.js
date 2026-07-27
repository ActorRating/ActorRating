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
    // Lower peak RAM during `next build` on small Coolify VPS (avoids OOM kills).
    webpackMemoryOptimizations: true,
    // Ensure listicle markdown is traced into the standalone output.
    outputFileTracingIncludes: {
      '/lists': ['./content/lists/**/*'],
      '/lists/[slug]': ['./content/lists/**/*'],
    },
    // Serve complete (non-streamed) HTML to crawlers so they never capture a
    // loading skeleton or empty Suspense fallback instead of real content.
    // Next.js already includes Googlebot by default; this extends the list.
    htmlLimitedBots:
      /Googlebot|AdsBot-Google|Storebot-Google|Google-InspectionTool|GoogleOther|Google-Extended|Mediapartners-Google|AdsBot-Google-Mobile|Bingbot|DuckDuckBot|YandexBot|Baiduspider|Slurp|facebookexternalhit|Twitterbot|LinkedInBot|WhatsApp|Applebot|AhrefsBot|SemrushBot|MJ12bot/,
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

  async redirects() {
    return [
      // Hub renamed Discover; keep /performances/[id] detail routes intact
      {
        source: "/performances",
        destination: "/discover",
        permanent: true,
      },
    ];
  },

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

      // Scripts: Google Analytics / gtag, reCAPTCHA, Vercel Analytics/Speed Insights
      // 'unsafe-eval' helps some Next/runtime tooling and packages; keep with 'unsafe-inline' for Next bootstrap
      // GA4 needs *.googletagmanager.com (not only www) — see https://developers.google.com/tag-platform/security/guides/csp
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.googletagmanager.com https://www.googletagmanager.com https://www.google-analytics.com https://ssl.google-analytics.com https://www.google.com https://www.gstatic.com https://va.vercel-scripts.com https://cloud.umami.is",

      // Styles: inline for Next + Google Fonts CSS
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",

      // Fonts: self/data + Google Fonts
      "font-src 'self' data: https://fonts.gstatic.com",

      // Images: blob for generated previews; TMDB + S3/CDN + GA beacons/pixels
      "img-src 'self' data: blob: https://image.tmdb.org https://actorrating.com https://*.amazonaws.com https://*.google-analytics.com https://www.google-analytics.com https://*.googletagmanager.com https://www.googletagmanager.com https://*.g.doubleclick.net https://www.google.com",

      // Video/audio previews if ever used
      "media-src 'self' blob: data:",

      // XHR/fetch/WebSocket: GA4 collect endpoints + reCAPTCHA + Formspree + Vercel telemetry + S3
      "connect-src 'self' https://www.google.com https://accounts.google.com https://oauth2.googleapis.com https://*.google-analytics.com https://www.google-analytics.com https://*.analytics.google.com https://analytics.google.com https://*.googletagmanager.com https://www.googletagmanager.com https://*.g.doubleclick.net https://formspree.io https://va.vercel-scripts.com https://vitals.vercel-insights.com https://insights.vercel.com https://api-js.mixpanel.com https://api.mixpanel.com https://cloud.umami.is https://api-gateway.umami.dev https://*.amazonaws.com",

      // reCAPTCHA + GA/GTM preview iframes
      "frame-src 'self' https://www.google.com https://www.googletagmanager.com",

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