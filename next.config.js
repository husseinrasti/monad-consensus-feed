/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure proper handling of API routes and BigInt libraries
  serverExternalPackages: ['monopulse'],
  // Disable output file tracing to avoid BigInt serialization issues
  output: 'standalone',
  // Exclude problematic packages from build trace collection
  outputFileTracingExcludes: {
    '*': ['node_modules/monopulse/**/*', 'node_modules/viem/**/*', 'node_modules/ws/**/*'],
  },
  // Webpack configuration to handle BigInt issues
  webpack: (config, { isServer, dev }) => {
    if (isServer) {
      // Mark monopulse as external to avoid bundling issues
      config.externals = config.externals || []
      config.externals.push('monopulse')
      
      // Add specific externals for viem and ws (MonoPulse dependencies)
      config.externals.push('viem')
      config.externals.push('ws')
    }
    
    // Handle BigInt serialization issues
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      crypto: false,
    }
    
    // Disable build optimization that causes BigInt issues
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        // Disable module concatenation that can cause BigInt issues
        concatenateModules: false,
      }
    }
    
    return config
  },
}

module.exports = nextConfig
