import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias['zlib-sync'] = false;
    }
    return config;
  },
  // Add this experimental section
  experimental: {
    // This is to allow the Next.js dev server to work correctly with the Firebase Studio environment.
    allowedDevOrigins: ["https://*.firebase.app", "https://*.web.app"],
  },
};

export default nextConfig;
