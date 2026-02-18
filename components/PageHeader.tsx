'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { LOGO_URL } from '@/lib/constants';
import Icon from './Icon';
import CartModal from './CartModal';
import InstantLink from './InstantLink';

interface PageHeaderProps {
  title: string;
}

export default function PageHeader({ title }: PageHeaderProps) {
  const [cartCount, setCartCount] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Determine if we're in admin context
  const isAdmin = pathname?.startsWith('/admin') || false;

  // Check user authentication & role
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Fetch role from cache or API
    const cachedRole = typeof window !== 'undefined' ? sessionStorage.getItem('marlon_user_role') : null;
    if (cachedRole) {
      setUserRole(cachedRole);
    } else {
      fetch('/api/user/role')
        .then(res => res.json())
        .then(data => {
          if (data.role) setUserRole(data.role);
        })
        .catch(() => {});
    }

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const loadCartCount = useCallback(async () => {
    try {
      const response = await fetch('/api/cart');
      const data = await response.json();
      const count = data.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
      setCartCount(count);
    } catch (error) {
      console.error('Error loading cart count:', error);
    }
  }, []);

  useEffect(() => {
    if (!isAdmin && user) {
      loadCartCount();
    }

    const handleCartUpdate = () => {
      if (user) loadCartCount();
    };
    window.addEventListener('cart-updated', handleCartUpdate);
    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
    };
  }, [isAdmin, user, loadCartCount]);

  // Handle click outside to close quick actions menu
  useEffect(() => {
    if (!showQuickActions) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setShowQuickActions(false);
      }
    };

    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showQuickActions]);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleCartClose = () => {
    setIsCartOpen(false);
    loadCartCount();
  };

  const handleSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    setMobileMenuOpen(false);
    try {
      await supabase.auth.signOut();
      window.location.href = '/catalog';
    } catch {
      window.location.href = '/catalog';
    } finally {
      setSigningOut(false);
    }
  };

  // Navigation items based on role
  const getNavItems = () => {
    if (!user) return [{ href: '/catalog', icon: 'mdi:store', label: 'Catalogue' }];
    if (userRole === 'admin') {
      return [
        { href: '/catalog', icon: 'mdi:store', label: 'Catalogue' },
        { href: '/orders', icon: 'mdi:package-variant', label: 'Commandes' },
        { href: '/equipments', icon: 'mdi:laptop', label: 'Équipements' },
        { href: '/employees', icon: 'mdi:account-group', label: 'Employés' },
        { href: '/support', icon: 'mdi:headset', label: 'Support' },
      ];
    }
    if (userRole === 'employee') {
      return [
        { href: '/equipments', icon: 'mdi:laptop', label: 'Mes équipements' },
        { href: '/support', icon: 'mdi:headset', label: 'Support' },
      ];
    }
    return [{ href: '/catalog', icon: 'mdi:store', label: 'Catalogue' }];
  };

  const navItems = getNavItems();

  // Quick actions
  const publicQuickActions = [
    { icon: 'mdi:shopping-outline', label: 'Commander', href: '/catalog', color: 'text-marlon-green' },
    { icon: 'mdi:account-plus-outline', label: 'Ajouter un employé', href: '/employees', color: 'text-blue-600' },
    { icon: 'mdi:headset', label: 'Nouveau ticket SAV', href: '/support', color: 'text-yellow-600' },
  ];

  const adminQuickActions = [
    { icon: 'mdi:package-variant', label: 'Ajouter un produit', href: '/admin/products', color: 'text-marlon-green' },
    { icon: 'mdi:shape', label: 'Ajouter une catégorie', href: '/admin/categories', color: 'text-blue-600' },
    { icon: 'mdi:account-group', label: 'Ajouter un client', href: '/admin/customers', color: 'text-purple-600' },
    { icon: 'mdi:clipboard-list', label: 'Nouvelle commande', href: '/admin/orders', color: 'text-orange-600' },
  ];

  const quickActions = isAdmin ? adminQuickActions : publicQuickActions;
  const settingsHref = isAdmin ? '/admin/settings' : '/settings';

  return (
    <>
      {/* ========== HEADER ========== */}
      <header className="fixed top-0 left-0 right-0 lg:left-64 h-14 lg:h-16 bg-white lg:bg-[#F9FAFB] z-20 border-b border-gray-200">
        <div className="h-full px-4 lg:px-6">
          <div className="flex h-full items-center justify-between">

            {/* Mobile: Logo left */}
            <div className="flex items-center gap-3 lg:hidden">
              <Link href="/catalog" className="flex items-center">
                <img src={LOGO_URL} alt="MARLON" className="h-7 w-auto" />
              </Link>
            </div>

            {/* Desktop: Title */}
            <h1 className="hidden lg:block text-2xl font-bold text-marlon-text">{title}</h1>

            {/* Right side */}
            <div className="flex items-center gap-2 lg:gap-4">
              {(user || isAdmin) && (
                <>
                  {/* Settings - desktop only */}
                  <Link
                    href={settingsHref}
                    className={`hidden lg:block p-2 transition-colors ${
                      pathname === settingsHref
                        ? 'text-marlon-green'
                        : 'text-gray-500 hover:text-marlon-green'
                    }`}
                    aria-label="Paramètres"
                  >
                    <Icon icon="mdi:cog-outline" className="h-5 w-5" />
                  </Link>

                  {/* Quick Actions - desktop only */}
                  <div className="hidden lg:block relative" ref={quickActionsRef}>
                    <button
                      onClick={() => setShowQuickActions(!showQuickActions)}
                      className={`flex items-center justify-center w-8 h-8 rounded-full transition-all ${
                        showQuickActions
                          ? 'bg-marlon-green text-white rotate-45'
                          : 'bg-marlon-green text-white hover:bg-marlon-green/90'
                      }`}
                      aria-label="Actions rapides"
                    >
                      <Icon icon="mdi:plus" className="h-5 w-5" />
                    </button>

                    {showQuickActions && (
                      <div
                        className="absolute top-full right-0 mt-2 w-56 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-[100]"
                        style={{ boxShadow: '0 10px 40px rgba(0,0,0,0.15)' }}
                      >
                        {quickActions.map((action, index) => (
                          <Link
                            key={index}
                            href={action.href}
                            onClick={() => setShowQuickActions(false)}
                            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors"
                          >
                            <Icon icon={action.icon} className={`h-5 w-5 ${action.color}`} />
                            <span className="text-sm font-medium text-gray-700">{action.label}</span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Cart - both mobile & desktop (public only) */}
                  {!isAdmin && (
                    <button
                      onClick={() => setIsCartOpen(true)}
                      className="relative p-2 text-gray-600 hover:text-marlon-green transition-colors"
                    >
                      <Icon icon="mdi:cart-outline" className="h-6 w-6" />
                      {cartCount > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-marlon-green text-[10px] font-semibold text-white">
                          {cartCount > 9 ? '9+' : cartCount}
                        </span>
                      )}
                    </button>
                  )}
                </>
              )}

              {/* Burger menu - mobile only */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
                aria-label="Menu"
              >
                <Icon icon="mdi:menu" className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ========== MOBILE DRAWER ========== */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer */}
          <div className="absolute top-0 right-0 h-full w-[280px] bg-white shadow-xl flex flex-col animate-slide-in-right">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200">
              <img src={LOGO_URL} alt="MARLON" className="h-7 w-auto" />
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Icon icon="mdi:close" className="h-5 w-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-3 px-3">
              {navItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <InstantLink
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors mb-1 ${
                      isActive
                        ? 'bg-marlon-green/10 text-marlon-green'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon
                      icon={item.icon}
                      className={`h-5 w-5 ${isActive ? 'text-marlon-green' : 'text-gray-400'}`}
                    />
                    {item.label}
                  </InstantLink>
                );
              })}

              {/* Divider */}
              <div className="my-3 border-t border-gray-200" />

              {/* Settings */}
              {user && (
                <InstantLink
                  href={settingsHref}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-colors mb-1 ${
                    pathname === settingsHref
                      ? 'bg-marlon-green/10 text-marlon-green'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon
                    icon="mdi:cog-outline"
                    className={`h-5 w-5 ${pathname === settingsHref ? 'text-marlon-green' : 'text-gray-400'}`}
                  />
                  Paramètres
                </InstantLink>
              )}
            </nav>

            {/* Drawer Footer - User */}
            <div className="border-t border-gray-200 p-4">
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 px-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {user.user_metadata?.first_name
                          ? `${user.user_metadata.first_name} ${user.user_metadata.last_name || ''}`.trim()
                          : user.email?.split('@')[0] || 'Utilisateur'}
                      </p>
                      {userRole && (
                        <p className="text-xs text-gray-500">
                          {userRole === 'admin' ? 'Administrateur' : 'Employé'}
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    <Icon icon={signingOut ? 'mdi:loading' : 'mdi:logout'} className={`h-4 w-4 ${signingOut ? 'animate-spin' : ''}`} />
                    {signingOut ? 'Déconnexion...' : 'Déconnexion'}
                  </button>
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
                    S&apos;inscrire
                  </InstantLink>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cart Modal */}
      {!isAdmin && <CartModal isOpen={isCartOpen} onClose={handleCartClose} />}
    </>
  );
}
