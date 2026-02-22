'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Icon from '@/components/Icon';

export default function AuthHashHandler() {
  const pathname = usePathname();
  const handledRef = useRef(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const skipPaths = ['/auth/callback', '/complete-invitation', '/reset-password'];
    if (skipPaths.includes(pathname) || handledRef.current) return;

    const hash = window.location.hash;
    if (!hash) return;

    const hashParams = new URLSearchParams(hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (!accessToken) return;

    handledRef.current = true;
    setProcessing(true);

    if (type === 'invite') {
      window.location.replace('/complete-invitation' + (window.location.search || '') + hash);
    } else if (type === 'recovery') {
      window.location.replace('/reset-password' + hash);
    } else if (type === 'magiclink') {
      window.location.replace('/auth/callback' + hash);
    }
  }, [pathname]);

  if (processing) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/95 backdrop-blur-sm">
        <div className="text-center">
          <Icon icon="mdi:loading" className="h-10 w-10 animate-spin text-marlon-green mx-auto mb-4" />
          <p className="text-gray-600">Redirection en cours...</p>
        </div>
      </div>
    );
  }

  return null;
}
