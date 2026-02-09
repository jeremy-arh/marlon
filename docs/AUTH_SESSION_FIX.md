# Fix pour le problème de session expirée

## Problème
Quand l'utilisateur est inactif pendant un certain temps, la session Supabase expire. Quand il revient et navigue, les données ne se chargent plus car les requêtes échouent silencieusement.

## Solution implémentée

### 1. Fonctions utilitaires créées

#### `lib/utils/auth-helpers.ts`
- `checkAndRefreshSession()` : Vérifie et rafraîchit automatiquement le token si nécessaire
- `isAuthError()` : Détecte si une erreur est liée à l'authentification
- `safeSupabaseQuery()` : Wrapper pour les requêtes Supabase avec gestion automatique des erreurs d'auth

#### `lib/hooks/useAuthSession.ts`
- Hook pour gérer la session d'authentification
- Détecte les expirations et redirige automatiquement

### 2. Pages mises à jour
- ✅ `app/(public)/orders/page.tsx` - Complètement mis à jour

### 3. Pages à mettre à jour

Pour chaque page qui charge des données depuis Supabase, appliquer le pattern suivant :

```typescript
import { useRouter } from 'next/navigation';
import { checkAndRefreshSession, safeSupabaseQuery, isAuthError } from '@/lib/utils/auth-helpers';

// Dans le composant
const router = useRouter();

// Dans la fonction de chargement
const loadData = async () => {
  try {
    // 1. Vérifier la session
    const isValidSession = await checkAndRefreshSession();
    if (!isValidSession) {
      router.push('/login');
      return;
    }

    // 2. Vérifier l'utilisateur
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError && isAuthError(userError)) {
      router.push('/login');
      return;
    }
    if (!user) {
      router.push('/login');
      return;
    }

    // 3. Utiliser safeSupabaseQuery pour les requêtes
    const { data, error } = await safeSupabaseQuery(
      () => supabase.from('table').select('*'),
      () => router.push('/login')
    );

    if (error?.isAuthError) {
      return;
    }
    
    // Traiter les données...
  } catch (error: any) {
    if (isAuthError(error)) {
      router.push('/login');
      return;
    }
  }
};

// Dans useEffect, mettre à jour le listener
useEffect(() => {
  loadData();
  
  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      loadData();
    } else if (event === 'SIGNED_OUT' || (!session && event === 'TOKEN_REFRESHED')) {
      router.push('/login');
    }
  });

  return () => subscription.unsubscribe();
}, [pathname, router]);
```

### Pages à mettre à jour :
- [ ] `app/(public)/equipments/page.tsx`
- [ ] `app/(public)/employees/page.tsx`
- [ ] `app/(public)/support/page.tsx`
- [ ] `app/(public)/settings/page.tsx`
- [ ] `app/(public)/cart/page.tsx`
- [ ] `app/(public)/checkout/page.tsx`
- [ ] `app/(public)/orders/[id]/page.tsx`
- [ ] `app/(public)/equipments/[id]/page.tsx`

## Comment tester

1. Se connecter à l'application
2. Naviguer vers une page (ex: /orders)
3. Attendre 1-2 heures (ou modifier le timeout de session dans Supabase pour tester plus rapidement)
4. Essayer de naviguer vers une autre page
5. Vérifier que vous êtes redirigé vers /login si la session est expirée
