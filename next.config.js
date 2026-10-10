/** @type {import('next').NextConfig} */
let isNext16OrAbove = false;
try {
  const nextVersion = require('next/package.json').version;
  isNext16OrAbove = parseInt(nextVersion.split('.')[0], 10) >= 16;
} catch {
  // fallback
}

const nextConfig = {
  experimental: {
    instrumentationHook: true,
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/dev-space/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
    ];
  },
  ...(isNext16OrAbove ? { turbopack: {} } : {}),
  webpack: (config, { dev }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };
    if (dev) {
      config.cache = false;
    }
    return config;
  },
};

module.exports = nextConfig;
