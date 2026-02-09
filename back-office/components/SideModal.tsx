'use client';

import { useEffect } from 'react';
import { Icon } from '@iconify/react';
import { createPortal } from 'react-dom';

interface SideModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function SideModal({ isOpen, onClose, title, children }: SideModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50">
      {/* Backdrop with blur */}
      <div
        className="absolute inset-0 lg:left-64 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div className="absolute left-0 lg:left-64 top-0 h-full w-full lg:w-[calc(100%-16rem)] bg-white shadow-xl transform transition-transform duration-300 ease-in-out overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3">
          <h2 className="text-lg font-semibold text-black">{title}</h2>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition-colors"
          >
            <Icon icon="mdi:close" className="h-5 w-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
