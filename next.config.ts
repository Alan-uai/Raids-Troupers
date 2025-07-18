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
    // A dependência @discordjs/ws tenta importar 'zlib-sync' opcionalmente.
    // O Webpack falha ao tentar resolver isso no lado do cliente.
    // Esta configuração instrui o Webpack a tratar 'zlib-sync' como um módulo vazio.
    if (!isServer) {
      config.resolve.alias['zlib-sync'] = false;
    }
    return config;
  },
};

export default nextConfig;
