'use client';

import { Icon as IconifyIcon } from '@iconify/react';

interface IconProps {
  icon: string;
  className?: string;
}

export default function Icon({ icon, className = 'h-5 w-5' }: IconProps) {
  return <IconifyIcon icon={icon} className={className} />;
}
