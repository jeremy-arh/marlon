'use client';

import { useEffect } from 'react';
import ClientSidebar from '@/components/ClientSidebar';
import RoutePrefetcher from '@/components/RoutePrefetcher';
import AuthHashHandler from '@/components/AuthHashHandler';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Routes principales à précharger immédiatement
  const mainRoutes = [
    '/catalog',
    '/orders',
    '/equipments',
    '/employees',
    '/support',
    '/cart',
    '/settings',
  ];

  // Intercepter les AbortError non gérées globalement
  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      // Ignorer complètement les AbortError - elles sont attendues lors de la navigation
      if (
        error?.name === 'AbortError' ||
        error?.message?.includes('aborted') ||
        error?.message?.includes('signal is aborted')
      ) {
        event.preventDefault(); // Empêcher l'affichage dans la console
        return;
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Traite le hash auth quand Supabase redirige vers /catalog au lieu de /auth/callback */}
      <AuthHashHandler />
      {/* Sidebar */}
      <ClientSidebar />
      
      {/* Préchargement automatique des routes */}
      <RoutePrefetcher routes={mainRoutes} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-64 overflow-hidden bg-[#F9FAFB]">
        {/* Content - pt-14 mobile / pt-16 desktop to account for fixed header height */}
        <main className="flex-1 overflow-y-auto pt-14 lg:pt-16">
          {children}
        </main>
      </div>
    </div>
  );
}
