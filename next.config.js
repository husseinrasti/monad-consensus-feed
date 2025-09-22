/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure proper handling of API routes and BigInt libraries
  serverExternalPackages: ['monopulse'],
  // Disable build traces collection to avoid BigInt issues
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
  // Experimental flag to handle ES modules better
  experimental: {
    esmExternals: 'loose',
  },
  // Webpack configuration to handle BigInt issues
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Mark monopulse as external to avoid bundling issues
      config.externals = config.externals || []
      config.externals.push('monopulse')
    }
    return config
  },
}

module.exports = nextConfig
