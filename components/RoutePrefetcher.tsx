'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface RoutePrefetcherProps {
  routes: string[];
}

/**
 * Composant qui précharge automatiquement les routes au montage
 * pour une navigation ultra-rapide
 */
export default function RoutePrefetcher({ routes }: RoutePrefetcherProps) {
  const router = useRouter();

  useEffect(() => {
    // Précharger toutes les routes en parallèle
    routes.forEach(route => {
      router.prefetch(route);
    });
  }, [router, routes]);

  return null;
}
