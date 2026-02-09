'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Icon from './Icon';

export default function AdminHeader() {
  const [showQuickActions, setShowQuickActions] = useState(false);
  const quickActionsRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

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

  // Quick actions menu items for admin
  const quickActions = [
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

  return (
    <header className="fixed top-0 left-0 right-0 lg:left-64 h-16 bg-[#F9FAFB] z-20 border-b border-gray-200">
      <div className="h-full px-6">
        <div className="flex h-full items-center justify-end">
          {/* Right side actions */}
          <div className="flex items-center gap-4">
            {/* Settings */}
            <Link
              href="/admin/settings"
              className={`p-2 transition-colors ${
                pathname === '/admin/settings'
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
          </div>
        </div>
      </div>
    </header>
  );
}
