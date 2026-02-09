import { supabase } from '@/lib/supabase/client';

/**
 * Vérifie si une erreur Supabase est liée à l'authentification
 */
export function isAuthError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message?.toLowerCase() || '';
  const errorCode = error.code?.toLowerCase() || '';
  
  return (
    errorMessage.includes('jwt') ||
    errorMessage.includes('expired') ||
    errorMessage.includes('invalid') ||
    errorMessage.includes('unauthorized') ||
    errorCode === 'pgrst301' ||
    errorCode === 'pgrst116' ||
    error?.status === 401
  );
}

/**
 * Vérifie et rafraîchit la session avant une requête
 * Retourne true si la session est valide, false sinon
 */
export async function checkAndRefreshSession(): Promise<boolean> {
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      console.log('No valid session found');
      return false;
    }

    // Vérifier si le token expire bientôt (dans les 5 prochaines minutes)
    const expiresAt = session.expires_at;
    if (expiresAt) {
      const expiresIn = expiresAt - Math.floor(Date.now() / 1000);
      
      // Si le token expire dans moins de 5 minutes, essayer de le rafraîchir
      if (expiresIn < 300) {
        console.log('Token expiring soon, refreshing...');
        const { data: { session: refreshedSession }, error: refreshError } = 
          await supabase.auth.refreshSession();
        
        if (refreshError || !refreshedSession) {
          console.error('Failed to refresh session:', refreshError);
          return false;
        }
        console.log('Session refreshed successfully');
      }
    }

    return true;
  } catch (error) {
    console.error('Error checking session:', error);
    return false;
  }
}

/**
 * Wrapper pour les requêtes Supabase qui gère automatiquement les erreurs d'authentification
 */
export async function safeSupabaseQuery<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  onAuthError?: () => void
): Promise<{ data: T | null; error: any }> {
  // Vérifier la session avant la requête
  const isValidSession = await checkAndRefreshSession();
  if (!isValidSession) {
    if (onAuthError) {
      onAuthError();
    }
    return { data: null, error: { message: 'Session expirée', code: 'SESSION_EXPIRED' } };
  }

  try {
    const result = await queryFn();
    
    // Vérifier si l'erreur est liée à l'authentification
    if (result.error && isAuthError(result.error)) {
      console.log('Authentication error detected:', result.error);
      if (onAuthError) {
        onAuthError();
      }
      return { data: null, error: { ...result.error, isAuthError: true } };
    }

    return result;
  } catch (error: any) {
    if (isAuthError(error)) {
      console.log('Authentication error in catch:', error);
      if (onAuthError) {
        onAuthError();
      }
      return { data: null, error: { ...error, isAuthError: true } };
    }
    throw error;
  }
}
