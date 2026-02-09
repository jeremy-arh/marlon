'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';
import { LOGO_URL } from '@/lib/constants';

export default function Sidebar() {
  const pathname = usePathname();

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
    { href: '/admin/support', icon: 'mdi:headset', label: 'Support' },
    { href: '/admin/settings', icon: 'mdi:cog', label: 'Paramètres' },
  ];

  return (
    <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-64 flex-col border-r border-gray-200 bg-white z-10 overflow-hidden">
      <div className="p-6 flex-shrink-0">
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
      <div className="flex-shrink-0 border-t border-gray-200 p-4">
        <Link
          href="/api/auth/signout"
          className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
        >
          <Icon icon="mdi:logout" className="h-5 w-5 text-gray-400" />
          Déconnexion
        </Link>
      </div>
    </aside>
  );
}
