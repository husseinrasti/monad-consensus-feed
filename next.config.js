/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure proper handling of API routes
  serverExternalPackages: ['monopulse'],
  // Disable build traces collection to avoid BigInt issues
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },
}

module.exports = nextConfig
