'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LOGO_URL } from '@/lib/constants';
import Icon from './Icon';

export default function Header() {
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [cartCount, setCartCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    
    // Get current user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Load cart count
    loadCartCount();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
    <header className="sticky top-0 z-50 border-b border-marlon-stroke bg-white">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" prefetch={true} className="flex items-center">
            <img
              src={LOGO_URL}
              alt="MARLON"
              className="h-8 w-auto"
            />
          </Link>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/catalog"
              prefetch={true}
              className={`text-sm font-medium transition-colors ${
                pathname === '/catalog' || pathname.startsWith('/catalog')
                  ? 'text-marlon-green'
                  : 'text-marlon-text hover:text-marlon-green'
              }`}
            >
              Catalogue
            </Link>
            {user && (
              <Link
                href="/orders"
                prefetch={true}
                className={`text-sm font-medium transition-colors ${
                  pathname === '/orders' || pathname.startsWith('/orders')
                    ? 'text-marlon-green'
                    : 'text-marlon-text hover:text-marlon-green'
                }`}
              >
                Commandes
              </Link>
            )}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-4">
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

            {/* User menu */}
            {user ? (
              <Link
                href="/account"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-marlon-text hover:bg-marlon-surface transition-colors"
              >
                <Icon icon="mdi:account-circle" className="h-6 w-6" />
                <span className="hidden sm:inline">Mon compte</span>
              </Link>
            ) : (
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
