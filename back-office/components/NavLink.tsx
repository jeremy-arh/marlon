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
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-white text-black'
          : 'text-black hover:bg-white/50'
      }`}
    >
      <Icon icon={icon} className="h-5 w-5" />
      {children}
    </Link>
  );
}
