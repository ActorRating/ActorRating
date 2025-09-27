/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  experimental: {
    serverComponentsExternalPackages: ['lucide-react'],
  },
}

module.exports = nextConfig