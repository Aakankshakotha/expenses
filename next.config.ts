import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enable strict mode for better development warnings
  reactStrictMode: true,

  // Transpile necessary packages for Next.js compatibility
  transpilePackages: [
    '@mui/material',
    '@mui/icons-material',
    '@emotion/react',
    '@emotion/styled',
  ],

  // Use custom ESLint config (.eslintrc.cjs) instead of Next.js built-in rules
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig
