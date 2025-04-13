/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Suppress hydration warnings caused by browser extensions
  // like Grammarly that modify the DOM
  experimental: {
    suppressHydrationWarning: true,
  },
}

module.exports = nextConfig 