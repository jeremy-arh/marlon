'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import Icon from './Icon';
import { LOGO_URL } from '@/lib/constants';

export default function ClientSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  useEffect(() => {
    const loadUserAndRole = async () => {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);

      if (currentUser) {
        // Get user role
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUser.id)
          .eq('status', 'active')
          .single();

        setUserRole(roleData?.role || null);
      }
    };

    loadUserAndRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .eq('status', 'active')
          .single();

        setUserRole(roleData?.role || null);
      } else {
        setUserRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
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
  let navItems = publicNavItems;
  if (user) {
    if (userRole === 'admin') {
      navItems = adminNavItems;
    } else if (userRole === 'employee') {
      navItems = employeeNavItems;
    } else {
      navItems = publicNavItems;
    }
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
            <Link
              key={item.href}
              href={item.href}
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
            </Link>
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
              <div className="absolute bottom-full left-0 right-0 pb-2 z-50">
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 py-1">
                  <button
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <Icon icon="mdi:logout" className="h-5 w-5" />
                    Déconnexion
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
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-marlon-green text-white text-sm font-medium rounded-lg hover:bg-marlon-green/90 transition-colors"
            >
              <Icon icon="mdi:login" className="h-5 w-5" />
              Se connecter
            </Link>
            <Link
              href="/register"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              <Icon icon="mdi:account-plus" className="h-5 w-5" />
              S'inscrire
            </Link>
          </div>
        )}
      </div>
    </aside>
  );
}
