'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Icon } from '@iconify/react';
import { LOGO_URL } from '@/lib/constants';

export default function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();

  const handleSignOut = async (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (signingOut) return; // Prevent multiple clicks
    
    setSigningOut(true);
    setIsOpen(false); // Close sidebar
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error);
      }
      
      // Force a full page reload to clear all state
      window.location.href = '/login';
    } catch (error) {
      console.error('Error during sign out:', error);
      // Force redirect even on error
      window.location.href = '/login';
    } finally {
      setSigningOut(false);
    }
  };

  const navItems = [
    { href: '/admin/dashboard', icon: 'mdi:view-dashboard', label: 'Dashboard' },
    { href: '/admin/orders', icon: 'mdi:clipboard-list', label: 'Commandes' },
    { href: '/admin/products', icon: 'mdi:package-variant', label: 'Produits' },
    { href: '/admin/categories', icon: 'mdi:shape', label: 'Catégories' },
    { href: '/admin/specialties', icon: 'mdi:medical-bag', label: 'Spécialités' },
    { href: '/admin/brands', icon: 'mdi:tag', label: 'Marques' },
    { href: '/admin/customers', icon: 'mdi:account-group', label: 'Clients' },
    { href: '/admin/leasers', icon: 'mdi:handshake', label: 'Leasers' },
    { href: '/admin/suppliers', icon: 'mdi:truck-delivery', label: 'Fournisseurs' },
  ];

  return (
    <>
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-md bg-white border border-gray-200 shadow-sm text-gray-600 hover:text-gray-900"
      >
        <Icon icon={isOpen ? 'mdi:close' : 'mdi:menu'} className="h-6 w-6" />
      </button>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`lg:hidden fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-40 transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <img
              src={LOGO_URL}
              alt="MARLON"
              className="h-6 w-auto"
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
                onClick={() => setIsOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-marlon-green-light text-marlon-green'
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
        <div className="mt-auto border-t border-gray-200 p-4">
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {signingOut ? (
              <>
                <Icon icon="mdi:loading" className="h-5 w-5 text-gray-400 animate-spin" />
                Déconnexion...
              </>
            ) : (
              <>
                <Icon icon="mdi:logout" className="h-5 w-5 text-gray-400" />
                Déconnexion
              </>
            )}
          </button>
        </div>
      </aside>
    </>
  );
}
