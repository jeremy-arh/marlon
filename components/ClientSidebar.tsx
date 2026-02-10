'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
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

  useEffect(() => {
    isMountedRef.current = true;
    
    const loadUserAndRole = async () => {
      try {
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        
        // Check if component is still mounted before updating state
        if (!isMountedRef.current) return;
        
        // Ignore AbortError from getUser
        if (userError && (userError.name === 'AbortError' || userError.message?.includes('aborted') || userError.message?.includes('signal is aborted'))) {
          return;
        }
        
        if (userError || !currentUser) {
          if (!isMountedRef.current) return;
          setUser(null);
          setUserRole(null);
          setLoadingRole(false);
          // Clear cache
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(ROLE_CACHE_KEY);
            sessionStorage.removeItem(ROLE_CACHE_USER_KEY);
          }
          return;
        }

        if (!isMountedRef.current) return;
        setUser(currentUser);

        // Check cache first
        if (typeof window !== 'undefined') {
          const cachedUserId = sessionStorage.getItem(ROLE_CACHE_USER_KEY);
          const cachedRole = sessionStorage.getItem(ROLE_CACHE_KEY);
          
          // If cache exists and user ID matches, use cached role immediately
          if (cachedUserId === currentUser.id && cachedRole !== null) {
            if (!isMountedRef.current) return;
            setUserRole(cachedRole);
            setLoadingRole(false);
            // Still verify in background (but don't block UI)
            supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', currentUser.id)
              .eq('status', 'active')
              .maybeSingle()
              .then(({ data: roleData }) => {
                if (!isMountedRef.current) return;
                const role = roleData?.role || null;
                if (role !== cachedRole) {
                  setUserRole(role);
                  sessionStorage.setItem(ROLE_CACHE_KEY, role || '');
                }
              })
              .catch((error) => {
                // Ignore AbortError completely - it's expected when component unmounts or navigation occurs
                if (error?.name === 'AbortError' || error?.message?.includes('aborted') || error?.message?.includes('signal is aborted')) {
                  return;
                }
                // Silently fail for other errors - keep cached value
              });
            return;
          }
        }

        // Load role from database
        if (!isMountedRef.current) return;
        setLoadingRole(true);
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .eq('status', 'active')
          .maybeSingle();

        if (!isMountedRef.current) return;

        if (roleError) {
          // Ignore AbortError completely - it's expected when component unmounts or navigation occurs
          if (roleError.name === 'AbortError' || roleError.message?.includes('aborted') || roleError.message?.includes('signal is aborted')) {
            return;
          }
          console.error('Error loading user role:', roleError);
          setUserRole(null);
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(ROLE_CACHE_KEY);
            sessionStorage.removeItem(ROLE_CACHE_USER_KEY);
          }
        } else {
          const role = roleData?.role || null;
          setUserRole(role);
          // Cache the role
          if (typeof window !== 'undefined') {
            sessionStorage.setItem(ROLE_CACHE_KEY, role || '');
            sessionStorage.setItem(ROLE_CACHE_USER_KEY, currentUser.id);
          }
        }
      } catch (error: any) {
        // Ignore AbortError completely - it's expected when component unmounts or navigation occurs
        if (error?.name === 'AbortError' || error?.message?.includes('aborted') || error?.message?.includes('signal is aborted')) {
          return;
        }
        // Only log non-AbortError errors
        if (!isMountedRef.current) return;
        console.error('Error in loadUserAndRole:', error);
        setUser(null);
        setUserRole(null);
      } finally {
        if (isMountedRef.current) {
          setLoadingRole(false);
        }
      }
    };

    loadUserAndRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isMountedRef.current) return;
      
      setUser(session?.user ?? null);
      if (session?.user) {
        // Only reload role if user changed (different user ID)
        const currentUserId = user?.id;
        if (session.user.id !== currentUserId) {
          // Clear old cache
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem(ROLE_CACHE_KEY);
            sessionStorage.removeItem(ROLE_CACHE_USER_KEY);
          }
          
          if (!isMountedRef.current) return;
          setLoadingRole(true);
          try {
            const { data: roleData, error: roleError } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .eq('status', 'active')
              .maybeSingle();

            if (!isMountedRef.current) return;

            if (roleError) {
              // Ignore AbortError completely - it's expected when component unmounts or navigation occurs
              if (roleError.name === 'AbortError' || roleError.message?.includes('aborted') || roleError.message?.includes('signal is aborted')) {
                return;
              }
              console.error('Error loading user role on auth change:', roleError);
              setUserRole(null);
            } else {
              const role = roleData?.role || null;
              setUserRole(role);
              // Cache the role
              if (typeof window !== 'undefined') {
                sessionStorage.setItem(ROLE_CACHE_KEY, role || '');
                sessionStorage.setItem(ROLE_CACHE_USER_KEY, session.user.id);
              }
            }
          } catch (error: any) {
            // Ignore AbortError completely - it's expected when component unmounts or navigation occurs
            if (error?.name === 'AbortError' || error?.message?.includes('aborted') || error?.message?.includes('signal is aborted')) {
              return;
            }
            // Only log non-AbortError errors
            if (isMountedRef.current) {
              console.error('Error in auth state change handler:', error);
              setUserRole(null);
            }
          } finally {
            if (isMountedRef.current) {
              setLoadingRole(false);
            }
          }
        }
        // If same user, keep the existing role from cache or state
      } else {
        if (isMountedRef.current) {
          setUserRole(null);
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
  }, [user?.id]);

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
            className="h-8 w-auto"
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
