/** @type {import('next').NextConfig} */
let isNext16OrAbove = false;
try {
  const nextVersion = require('next/package.json').version;
  isNext16OrAbove = parseInt(nextVersion.split('.')[0], 10) >= 16;
} catch {
  // fallback
}

const nextConfig = {
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
