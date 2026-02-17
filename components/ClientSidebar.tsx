'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import Icon from './Icon';
import { LOGO_URL } from '@/lib/constants';
import InstantLink from './InstantLink';

export default function ClientSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  
  // Cache the role in sessionStorage to avoid reloading on navigation
  const ROLE_CACHE_KEY = 'marlon_user_role';
  const ROLE_CACHE_USER_KEY = 'marlon_user_id';
  
  // Initialize role from cache if available
  const getCachedRole = (): string | null => {
    if (typeof window === 'undefined') return null;
    const cachedRole = sessionStorage.getItem(ROLE_CACHE_KEY);
    return cachedRole || null;
  };
  
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(getCachedRole());
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [loadingRole, setLoadingRole] = useState(false);
  const isMountedRef = useRef(true);
  const userIdRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  // Précharger toutes les routes de navigation au montage
  useEffect(() => {
    const routesToPrefetch = [
      '/catalog',
      '/orders',
      '/equipments',
      '/employees',
      '/support',
    ];
    
    routesToPrefetch.forEach(route => {
      router.prefetch(route);
    });
  }, [router]);

  // Fonction pour charger le rôle via la route API serveur (plus fiable que le client Supabase)
  const fetchUserRole = useCallback(async () => {
    // Prevent concurrent fetches
    if (loadingRef.current) return;
    loadingRef.current = true;
    
    if (isMountedRef.current) {
      setLoadingRole(true);
    }
    
    try {
      const response = await fetch('/api/user/role');
      
      if (!isMountedRef.current) return;
      
      if (!response.ok) {
        console.error('Error fetching user role: HTTP', response.status);
        setUser(null);
        setUserRole(null);
        return;
      }
      
      const data = await response.json();
      
      if (!isMountedRef.current) return;
      
      if (data.user) {
        setUser(data.user);
        userIdRef.current = data.user.id;
        setUserRole(data.role);
        
        // Cache the role
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(ROLE_CACHE_KEY, data.role || '');
          sessionStorage.setItem(ROLE_CACHE_USER_KEY, data.user.id);
        }
      } else {
        setUser(null);
        setUserRole(null);
        userIdRef.current = null;
        // Clear cache
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(ROLE_CACHE_KEY);
          sessionStorage.removeItem(ROLE_CACHE_USER_KEY);
        }
      }
    } catch (error: any) {
      if (!isMountedRef.current) return;
      console.error('Error fetching user role:', error);
    } finally {
      loadingRef.current = false;
      if (isMountedRef.current) {
        setLoadingRole(false);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    // Check cache first for instant display
    if (typeof window !== 'undefined') {
      const cachedUserId = sessionStorage.getItem(ROLE_CACHE_USER_KEY);
      const cachedRole = sessionStorage.getItem(ROLE_CACHE_KEY);
      
      if (cachedUserId && cachedRole) {
        setUserRole(cachedRole);
        userIdRef.current = cachedUserId;
        // Set a minimal user object from cache so the sidebar shows the profile section
        setUser({ id: cachedUserId });
      }
    }

    // Load user and role from the server API route (bypasses all browser-side auth issues)
    fetchUserRole();

    // Listen for auth state changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMountedRef.current) return;
      
      if (session?.user) {
        // Only reload if user actually changed
        if (session.user.id !== userIdRef.current) {
          // Clear old cache
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(ROLE_CACHE_KEY);
            sessionStorage.removeItem(ROLE_CACHE_USER_KEY);
          }
          userIdRef.current = session.user.id;
          // Reload role from server
          fetchUserRole();
        }
      } else {
        // User logged out
        if (isMountedRef.current) {
          setUser(null);
          setUserRole(null);
          userIdRef.current = null;
          setLoadingRole(false);
        }
        // Clear cache on logout
        if (typeof window !== 'undefined') {
          sessionStorage.removeItem(ROLE_CACHE_KEY);
          sessionStorage.removeItem(ROLE_CACHE_USER_KEY);
        }
      }
    });

    return () => {
      isMountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSignOut = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();
    
    if (signingOut) return; // Prevent multiple clicks
    
    setSigningOut(true);
    setShowProfileMenu(false); // Close menu immediately
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
        // Even if there's an error, try to redirect
      }
      
      // Force a full page reload to clear all state
      window.location.href = '/catalog';
    } catch (error) {
      console.error('Error during sign out:', error);
      // Force redirect even on error
      window.location.href = '/catalog';
    } finally {
      setSigningOut(false);
    }
  };

  // Items de navigation selon l'état de connexion et le rôle
  const publicNavItems = [
    { href: '/catalog', icon: 'mdi:store', label: 'Catalogue' },
  ];

  // Navigation pour les administrateurs
  const adminNavItems = [
    { href: '/catalog', icon: 'mdi:store', label: 'Catalogue' },
    { href: '/orders', icon: 'mdi:package-variant', label: 'Commandes' },
    { href: '/equipments', icon: 'mdi:laptop', label: 'Équipements' },
    { href: '/employees', icon: 'mdi:account-group', label: 'Employés' },
    { href: '/support', icon: 'mdi:headset', label: 'Support' },
  ];

  // Navigation pour les employés (accès limité)
  const employeeNavItems = [
    { href: '/equipments', icon: 'mdi:laptop', label: 'Mes équipements' },
    { href: '/support', icon: 'mdi:headset', label: 'Support' },
  ];

  // Déterminer les items de navigation à afficher
  // Use userRole if available, otherwise wait for it to load
  let navItems = publicNavItems;
  if (user) {
    // If we have a role (from initialUserRole or loaded), use it
    if (userRole === 'admin') {
      navItems = adminNavItems;
    } else if (userRole === 'employee') {
      navItems = employeeNavItems;
    } else if (!loadingRole) {
      // If role is loaded but null/undefined, show public items
      navItems = publicNavItems;
    }
    // If loadingRole is true, keep showing publicNavItems until role is loaded
  }

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 flex-col border-r border-gray-200 bg-white z-10 overflow-hidden">
      <div className="p-6 flex-shrink-0">
        <div className="mb-4 flex items-center justify-center">
          <img
            src={LOGO_URL}
            alt="MARLON"
            className="h-10 w-auto"
          />
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-4 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <InstantLink
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-marlon-green/10 text-marlon-green'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon 
                icon={item.icon} 
                className={`h-5 w-5 ${
                  isActive ? 'text-marlon-green' : 'text-gray-400'
                }`} 
              />
              {item.label}
            </InstantLink>
          );
        })}
      </nav>
      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        {user ? (
          <div 
            className="relative"
            onMouseEnter={() => setShowProfileMenu(true)}
            onMouseLeave={() => setShowProfileMenu(false)}
          >
            {/* Menu flottant */}
            {showProfileMenu && (
              <div 
                className="absolute bottom-full left-0 right-0 pb-2 z-50"
                onMouseEnter={() => setShowProfileMenu(true)}
                onMouseLeave={() => !signingOut && setShowProfileMenu(false)}
              >
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {signingOut ? (
                      <>
                        <Icon icon="mdi:loading" className="h-5 w-5 animate-spin" />
                        Déconnexion...
                      </>
                    ) : (
                      <>
                        <Icon icon="mdi:logout" className="h-5 w-5" />
                        Déconnexion
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
              <Icon icon="mdi:account-circle" className="h-5 w-5 text-gray-400" />
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-gray-600 truncate block">
                  {user.user_metadata?.first_name 
                    ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
                    : user.email?.split('@')[0] || 'Utilisateur'}
                </span>
                {userRole && (
                  <span className="text-xs text-gray-400">
                    {userRole === 'admin' ? 'Administrateur' : 'Employé'}
                  </span>
                )}
              </div>
              <Icon icon="mdi:chevron-up" className={`h-4 w-4 text-gray-400 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <InstantLink
              href="/login"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-marlon-green text-white text-sm font-medium rounded-lg hover:bg-marlon-green/90 transition-colors"
            >
              <Icon icon="mdi:login" className="h-5 w-5" />
              Se connecter
            </InstantLink>
            <InstantLink
              href="/register"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Icon icon="mdi:account-plus" className="h-5 w-5" />
              S'inscrire
            </InstantLink>
          </div>
        )}
      </div>
    </aside>
  );
}
