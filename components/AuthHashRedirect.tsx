'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function AuthHashRedirect() {
  const pathname = usePathname();

  useEffect(() => {
    const skipPaths = ['/auth/callback', '/complete-invitation', '/reset-password'];
    if (skipPaths.includes(pathname)) return;

    const hash = window.location.hash;
    if (!hash) return;

    const hashParams = new URLSearchParams(hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');

    if (!accessToken) return;

    if (type === 'invite') {
      window.location.replace('/complete-invitation' + (window.location.search || '') + hash);
    } else if (type === 'recovery') {
      window.location.replace('/reset-password' + hash);
    } else if (type === 'magiclink') {
      window.location.replace('/auth/callback' + hash);
    }
  }, [pathname]);

  return null;
}
