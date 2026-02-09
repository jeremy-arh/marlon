'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@iconify/react';

interface NavLinkProps {
  href: string;
  icon: string;
  children: React.ReactNode;
}

export default function NavLink({ href, icon, children }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(href + '/');

  return (
    <Link
      href={href}
      className={`flex items-center gap-2 transition-colors ${
        isActive
          ? 'text-black font-semibold'
          : 'text-gray-700 hover:text-black'
      }`}
    >
      <Icon icon={icon} className="h-5 w-5" />
      {children}
    </Link>
  );
}
