import type { NextConfig } from "next";
import withBundleAnalyzer from "@next/bundle-analyzer";

const nextConfig: NextConfig = {
  // Image optimization configuration
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1 year
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Performance optimizations
  experimental: {
    optimizePackageImports: ['@tanstack/react-query'],
    optimizeCss: true,
    webVitalsAttribution: ['CLS', 'LCP', 'FID', 'FCP', 'TTFB'],
  },

  // Bundle optimization
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  // Mobile-optimized webpack configuration
  webpack: (config, { dev, isServer }) => {
    // Mobile-specific optimizations
    if (!dev && !isServer) {
      // Code splitting for mobile components
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          mobile: {
            test: /[\\/]mobile[\\/]/,
            name: 'mobile',
            chunks: 'all',
            priority: 10,
          },
          gestures: {
            test: /[\\/](gesture|touch)[\\/]/,
            name: 'gestures',
            chunks: 'all',
            priority: 9,
          },
          performance: {
            test: /[\\/]performance[\\/]/,
            name: 'performance',
            chunks: 'all',
            priority: 8,
          },
        },
      }

      // Minimize bundle size for mobile
      config.optimization.usedExports = true
      config.optimization.sideEffects = false
    }

    return config
  },

  // Headers for caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
        ],
      },
    ];
  },
};

// Bundle analyzer configuration
const bundleAnalyzer = withBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default bundleAnalyzer(nextConfig);
