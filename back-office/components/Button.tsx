'use client';

import { Icon } from '@iconify/react';
import { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  href?: string;
  variant?: 'primary' | 'secondary' | 'outline';
  icon?: string;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({
  children,
  onClick,
  href,
  variant = 'primary',
  icon,
  disabled = false,
  className = '',
  type = 'button',
  size = 'md',
}: ButtonProps) {
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  const baseClasses = `inline-flex items-center gap-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${sizeClasses[size]}`;
  
  const variantClasses = {
    primary: 'bg-marlon-green text-white hover:bg-[#00A870] focus:ring-marlon-green',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-500',
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${className}`;

  if (href) {
    return (
      <a href={href} className={classes}>
        {icon && <Icon icon={icon} className="h-5 w-5" />}
        {children}
      </a>
    );
  }

  return (
    <button type={type} onClick={onClick} disabled={disabled} className={classes}>
      {icon && <Icon icon={icon} className="h-5 w-5" />}
      {children}
    </button>
  );
}
