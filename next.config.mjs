/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["jsdom", "roughjs"],
  },
};

export default nextConfig;
