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
      // Google OAuth avatars (foto de perfil do Google)
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
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
