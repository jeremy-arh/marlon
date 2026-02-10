'use client';

import ClientSidebar from '@/components/ClientSidebar';
import RoutePrefetcher from '@/components/RoutePrefetcher';

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

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <ClientSidebar />
      
      {/* Préchargement automatique des routes */}
      <RoutePrefetcher routes={mainRoutes} />
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:ml-64 overflow-hidden bg-[#F9FAFB]">
        {/* Content - pt-16 to account for fixed header height */}
        <main className="flex-1 overflow-y-auto pt-16">
          {children}
        </main>
      </div>
    </div>
  );
}
