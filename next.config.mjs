/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true,
  swcMinify: true,
  webpack: (config, { isServer }) => {
    config.optimization.minimize = false;
    return config;
  },
};

export default nextConfig;
