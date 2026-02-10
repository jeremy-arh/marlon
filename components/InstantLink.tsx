'use client';

import { useRouter, usePathname } from 'next/navigation';
import { startTransition, useEffect, useRef } from 'react';
import { ReactNode } from 'react';
import { supabase } from '@/lib/supabase/client';

interface InstantLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  prefetch?: boolean;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export default function InstantLink({
  href,
  children,
  className = '',
  prefetch = true,
  onClick,
}: InstantLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');
  const linkRef = useRef<HTMLAnchorElement>(null);

  // Prefetch immédiatement au montage et au survol
  useEffect(() => {
    if (!prefetch) return;
    
    // Précharger immédiatement au montage
    router.prefetch(href);
    
    if (!linkRef.current) return;

    const link = linkRef.current;
    const handleMouseEnter = () => {
      // Précharger aussi au survol pour être sûr
      router.prefetch(href);
    };

    link.addEventListener('mouseenter', handleMouseEnter);
    return () => {
      link.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [href, router, prefetch]);

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Si c'est un clic avec Ctrl/Cmd ou sur un lien externe, laisser le comportement par défaut
    if (e.ctrlKey || e.metaKey || e.shiftKey) {
      return;
    }

    // Si c'est un lien externe ou un hash, laisser le comportement par défaut
    if (href.startsWith('http') || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
      return;
    }

    // Si l'utilisateur est déjà connecté et essaie d'aller sur /login, rediriger vers /catalog
    if (href === '/login' || href.startsWith('/login')) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          e.preventDefault();
          startTransition(() => {
            router.push('/catalog');
          });
          return;
        }
      } catch (error) {
        // Ignore errors, continue with normal navigation
      }
    }

    e.preventDefault();
    
    // Appeler le onClick personnalisé si fourni
    onClick?.(e);

    // Navigation instantanée - push immédiatement sans attendre
    // Utiliser startTransition pour ne pas bloquer l'UI et permettre la navigation optimiste
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <a
      ref={linkRef}
      href={href}
      onClick={handleClick}
      className={className}
    >
      {children}
    </a>
  );
}
