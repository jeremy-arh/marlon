'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Icon from './Icon';
import CartModal from './CartModal';

interface PageHeaderProps {
  title: string;
}

export default function PageHeader({ title }: PageHeaderProps) {
  const [cartCount, setCartCount] = useState(0);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Determine if we're in admin context
  const isAdmin = pathname?.startsWith('/admin') || false;

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

  useEffect(() => {
    if (!isAdmin) {
      loadCartCount();
    }
  }, [isAdmin]);

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

  // Reload cart count when modal closes (in case items were modified)
  const handleCartClose = () => {
    setIsCartOpen(false);
    loadCartCount();
  };

  // Quick actions for admin
  const adminQuickActions = [
    {
      icon: 'mdi:package-variant',
      label: 'Ajouter un produit',
      href: '/admin/products',
      color: 'text-marlon-green',
    },
    {
      icon: 'mdi:shape',
      label: 'Ajouter une catégorie',
      href: '/admin/categories',
      color: 'text-blue-600',
    },
    {
      icon: 'mdi:account-group',
      label: 'Ajouter un client',
      href: '/admin/customers',
      color: 'text-purple-600',
    },
    {
      icon: 'mdi:clipboard-list',
      label: 'Nouvelle commande',
      href: '/admin/orders',
      color: 'text-orange-600',
    },
  ];

  // Quick actions for public
  const publicQuickActions = [
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

  const quickActions = isAdmin ? adminQuickActions : publicQuickActions;
  const settingsHref = isAdmin ? '/admin/settings' : '/settings';

  return (
    <>
      <header className="fixed top-0 left-0 right-0 lg:left-64 h-16 bg-[#F9FAFB] z-20 border-b border-gray-200">
        <div className="h-full px-6">
          <div className="flex h-full items-center justify-between">
            {/* Title */}
            <h1 className="text-2xl font-bold text-marlon-text">{title}</h1>

            {/* Right side actions */}
            <div className="flex items-center gap-4">
              {/* Settings */}
              <Link
                href={settingsHref}
                className={`p-2 transition-colors ${
                  pathname === settingsHref
                    ? 'text-marlon-green'
                    : 'text-gray-500 hover:text-marlon-green'
                }`}
                aria-label="Paramètres"
              >
                <Icon icon="mdi:cog-outline" className="h-5 w-5" />
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
                        <span className="text-sm font-medium text-gray-700">{action.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart - only show in public context */}
              {!isAdmin && (
                <button
                  onClick={() => setIsCartOpen(true)}
                  className="relative p-2 text-marlon-green hover:text-marlon-green/80 transition-colors"
                >
                  <Icon icon="mdi:cart-outline" className="h-6 w-6" />
                  {cartCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-marlon-green text-xs font-semibold text-white">
                      {cartCount > 9 ? '9+' : cartCount}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Cart Modal - only show in public context */}
      {!isAdmin && <CartModal isOpen={isCartOpen} onClose={handleCartClose} />}
    </>
  );
}
