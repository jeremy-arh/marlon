/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  // Supprime les avertissements d'hydratation pour les attributs ajoutés par les extensions de navigateur
  reactStrictMode: true,
  // Configuration pour réduire les avertissements d'hydratation
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

export default nextConfig;
