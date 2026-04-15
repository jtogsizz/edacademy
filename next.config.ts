import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Supabase Storage (avatars, fotos)
      {
        protocol: 'https',
        hostname: 'jjwiytsirkmyhcfcsfgg.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // Produção
      {
        protocol: 'https',
        hostname: 'edacademy.app',
      },
    ],
  },
};

export default nextConfig;
