'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      const type = params.get('type');
      if (accessToken) {
        if (type === 'invite') {
          window.location.replace('/complete-invitation' + (window.location.search || '') + hash);
          return;
        }
        if (type === 'recovery') {
          window.location.replace('/reset-password' + hash);
          return;
        }
        window.location.replace('/auth/callback' + hash);
        return;
      }
    }
    router.replace('/catalog');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB]">
      <div className="animate-pulse text-gray-400">Chargement...</div>
    </div>
  );
}
