'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase/client';
import { LOGO_URL } from '@/lib/constants';
import Icon from './Icon';

export default function ClientHeader() {
  const [user, setUser] = useState<any>(null);
  const [cartCount, setCartCount] = useState(0);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const quickActionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      if (user) {
        loadCartCount();
      }
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        loadCartCount();
      }
    });

    // Listen for cart-updated events (dispatched after adding to cart)
    const handleCartUpdate = () => {
      loadCartCount();
    };
    window.addEventListener('cart-updated', handleCartUpdate);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('cart-updated', handleCartUpdate);
    };
  }, []);

  // Handle click outside to close quick actions menu
  useEffect(() => {
    if (!showQuickActions) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (quickActionsRef.current && !quickActionsRef.current.contains(event.target as Node)) {
        setShowQuickActions(false);
      }
    };

    // Small delay to prevent immediate close on the same click that opens the menu
    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 10);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showQuickActions]);

  const quickActions = [
    {
      icon: 'mdi:shopping-outline',
      label: 'Commander',
      href: '/catalog',
      color: 'text-marlon-green',
    },
    {
      icon: 'mdi:account-plus-outline',
      label: 'Ajouter un employé',
      href: '/employees',
      color: 'text-blue-600',
    },
    {
      icon: 'mdi:headset',
      label: 'Nouveau ticket SAV',
      href: '/support',
      color: 'text-yellow-600',
    },
  ];

  const loadCartCount = async () => {
    try {
      const response = await fetch('/api/cart');
      const data = await response.json();
      const count = data.items?.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0) || 0;
      setCartCount(count);
    } catch (error) {
      console.error('Error loading cart count:', error);
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 lg:left-64 h-16 border-b border-marlon-stroke bg-white z-20 overflow-visible">
      <div className="h-full px-4 lg:px-6 overflow-visible">
        <div className="flex h-full items-center justify-between overflow-visible">
          {/* Logo - visible on mobile only */}
          <Link href="/" className="flex items-center lg:hidden">
            <img
              src={LOGO_URL}
              alt="MARLON"
              className="h-8 w-auto"
            />
          </Link>

          {/* Right side actions */}
          <div className="flex items-center gap-4 ml-auto">
            {/* Only show icons if user is authenticated */}
            {user && (
              <>
                {/* Settings */}
                <Link
                  href="/settings"
                  className="p-2 text-marlon-text hover:text-marlon-green transition-colors"
                  aria-label="Paramètres"
                >
                  <Icon icon="mdi:cog-outline" className="h-6 w-6" />
                </Link>

                {/* Quick Actions button */}
                <div className="relative" ref={quickActionsRef}>
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

                  {/* Floating menu */}
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
                          <span className="text-sm text-gray-700">{action.label}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Cart */}
                <Link
                  href="/cart"
                  className="relative p-2 text-marlon-text hover:text-marlon-green transition-colors"
                >
                  <Icon icon="mdi:cart-outline" className="h-6 w-6" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-marlon-green text-xs font-semibold text-white">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </Link>
              </>
            )}

            {/* User menu */}
            {!user && (
              <div className="flex items-center gap-2">
                <Link
                  href="/login"
                  className="rounded-md px-4 py-2 text-sm font-medium text-marlon-text hover:bg-marlon-surface transition-colors"
                >
                  Se connecter
                </Link>
                <Link
                  href="/register"
                  className="rounded-md bg-marlon-green px-4 py-2 text-sm font-semibold text-white hover:bg-[#00A870] transition-colors"
                >
                  S'inscrire
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
