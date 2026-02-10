'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';

/**
 * Hook pour gérer la session d'authentification et détecter les expirations
 */
export function useAuthSession() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const checkSession = async () => {
      try {
        // Vérifier la session actuelle
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Session error:', error);
          if (mounted) {
            setIsAuthenticated(false);
            setIsLoading(false);
          }
          return;
        }

        if (mounted) {
          setIsAuthenticated(!!session);
          setIsLoading(false);
        }

        // Si pas de session, rediriger vers le catalogue
        if (!session) {
          router.push('/catalog');
          return;
        }
      } catch (error) {
        console.error('Error checking session:', error);
        if (mounted) {
          setIsAuthenticated(false);
          setIsLoading(false);
        }
      }
    };

    // Vérifier immédiatement
    checkSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (mounted) {
          setIsAuthenticated(!!session);
          
          // Si déconnexion ou expiration, rediriger vers le catalogue
          if (event === 'SIGNED_OUT' || (!session && event === 'TOKEN_REFRESHED')) {
            router.push('/catalog');
          }
          
          // Si reconnexion, recharger la page pour mettre à jour les données
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            // Ne pas recharger si c'est juste un refresh de token
            if (event === 'SIGNED_IN') {
              window.location.reload();
            }
          }
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return { isAuthenticated, isLoading };
}

/**
 * Fonction utilitaire pour vérifier et rafraîchir la session avant une requête
 */
export async function ensureAuthenticatedSession(): Promise<boolean> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      return false;
    }

    if (!session) {
      return false;
    }

    // Vérifier si le token est expiré ou va bientôt expirer (dans les 5 prochaines minutes)
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const expiresIn = expiresAt - Math.floor(Date.now() / 1000);
      
      // Si le token expire dans moins de 5 minutes, essayer de le rafraîchir
      if (expiresIn < 300) {
        const { data: { session: refreshedSession }, error: refreshError } = 
          await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession) {
          console.error('Failed to refresh session:', refreshError);
          return false;
        }
      }
    }

    return true;
  } catch (error) {
    console.error('Error ensuring authenticated session:', error);
    return false;
  }
}
